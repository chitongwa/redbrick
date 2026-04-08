// ── Float management service ──
// Shared FIFO deduction logic used by both trade-credit and loan routes.
// All token deliveries come from the same float pool.

import { query } from '../config/db.js';

const LOW_THRESHOLD      = 5000;   // kWh — flag LOW
const CRITICAL_THRESHOLD = 1000;   // kWh — flag CRITICAL

/**
 * Deduct units from float inventory using FIFO (oldest stock first).
 * Records a float_transaction for each inventory batch touched.
 *
 * @param {number}      units    kWh to deduct
 * @param {string|null} userId   Customer user ID (null for adjustments)
 * @param {string}      note     Audit note, e.g. "Trade credit order #42"
 * @returns {Promise<{ success: boolean, deducted: number, costZmw: number, alert: string|null }>}
 */
export async function deductFloat(units, userId, note) {
  let remaining = units;
  let totalCost = 0;

  // Fetch oldest batches with remaining stock (FIFO)
  const batches = await query(
    `SELECT id, units_remaining, unit_cost_zmw
     FROM float_inventory
     WHERE units_remaining > 0
     ORDER BY purchase_date ASC`
  );

  if (batches.rows.length === 0) {
    return { success: false, deducted: 0, costZmw: 0, alert: 'CRITICAL', error: 'Float inventory is empty — no stock available' };
  }

  for (const batch of batches.rows) {
    if (remaining <= 0) break;

    const available = parseFloat(batch.units_remaining);
    const take = Math.min(remaining, available);
    const costPerUnit = parseFloat(batch.unit_cost_zmw);
    const batchCost = Math.round(take * costPerUnit * 100) / 100;

    // Deduct from this batch
    await query(
      `UPDATE float_inventory
       SET units_remaining = units_remaining - $1
       WHERE id = $2`,
      [take, batch.id]
    );

    // Record the sale transaction
    await query(
      `INSERT INTO float_transactions (float_id, transaction_type, units, amount_zmw, user_id, note)
       VALUES ($1, 'sale', $2, $3, $4, $5)`,
      [batch.id, -take, batchCost, userId, note]
    );

    totalCost += batchCost;
    remaining -= take;
  }

  if (remaining > 0) {
    // Partial deduction — not enough stock
    return {
      success: false,
      deducted: units - remaining,
      costZmw: totalCost,
      alert: 'CRITICAL',
      error: `Insufficient float: needed ${units} kWh but only ${units - remaining} available`,
    };
  }

  // Check alert level after deduction
  const alert = await getAlertLevel();

  return { success: true, deducted: units, costZmw: totalCost, alert };
}

/**
 * Get the current float balance summary.
 * @returns {Promise<object>}
 */
export async function getFloatBalance() {
  // Total remaining units & value at cost
  const balanceResult = await query(
    `SELECT
       COALESCE(SUM(units_remaining), 0) AS total_units,
       COALESCE(SUM(units_remaining * unit_cost_zmw), 0) AS total_value_zmw
     FROM float_inventory
     WHERE units_remaining > 0`
  );

  const totalUnits = parseFloat(balanceResult.rows[0].total_units);
  const totalValue = parseFloat(balanceResult.rows[0].total_value_zmw);

  // Average daily sales over last 30 days
  const salesResult = await query(
    `SELECT COALESCE(SUM(ABS(units)), 0) AS total_sold
     FROM float_transactions
     WHERE transaction_type = 'sale'
       AND created_at >= now() - INTERVAL '30 days'`
  );

  const totalSold30d = parseFloat(salesResult.rows[0].total_sold);
  const avgDailySales = totalSold30d / 30;
  const estimatedDaysOfStock = avgDailySales > 0
    ? Math.round(totalUnits / avgDailySales)
    : null;  // null = no sales data

  // Alert level
  let alertLevel = null;
  if (totalUnits < CRITICAL_THRESHOLD) alertLevel = 'CRITICAL';
  else if (totalUnits < LOW_THRESHOLD) alertLevel = 'LOW';

  return {
    total_units_kwh:       Math.round(totalUnits * 100) / 100,
    total_value_zmw:       Math.round(totalValue * 100) / 100,
    avg_daily_sales_kwh:   Math.round(avgDailySales * 100) / 100,
    estimated_days_of_stock: estimatedDaysOfStock,
    alert_level:           alertLevel,
    thresholds: {
      low:      LOW_THRESHOLD,
      critical: CRITICAL_THRESHOLD,
    },
  };
}

/**
 * Reserve units from float inventory (FIFO) without selling.
 * Creates a float_reservation and per-batch holds.
 * Units are deducted from units_remaining to prevent double-sell,
 * but no float_transaction is recorded until confirmFloat().
 *
 * @param {number}  units    kWh to reserve
 * @param {number}  orderId  Trade credit order ID
 * @returns {Promise<{ success: boolean, reservationId: string|null, units: number, costZmw: number, alert: string|null, error?: string }>}
 */
export async function reserveFloat(units, orderId) {
  // Check total available stock
  const availResult = await query(
    `SELECT COALESCE(SUM(units_remaining), 0) AS total
     FROM float_inventory
     WHERE units_remaining > 0`
  );
  const totalAvailable = parseFloat(availResult.rows[0].total);

  if (totalAvailable < units) {
    return {
      success: false,
      reservationId: null,
      units: 0,
      costZmw: 0,
      alert: totalAvailable < CRITICAL_THRESHOLD ? 'CRITICAL' : totalAvailable < LOW_THRESHOLD ? 'LOW' : null,
      error: `Insufficient float: need ${units} kWh, only ${totalAvailable} available`,
    };
  }

  // Create reservation record
  const resResult = await query(
    `INSERT INTO float_reservations (order_id, units_reserved, status)
     VALUES ($1, $2, 'held')
     RETURNING id`,
    [orderId, units]
  );
  const reservationId = resResult.rows[0].id;

  // Walk FIFO batches and hold units
  let remaining = units;
  let totalCost = 0;

  const batches = await query(
    `SELECT id, units_remaining, unit_cost_zmw
     FROM float_inventory
     WHERE units_remaining > 0
     ORDER BY purchase_date ASC`
  );

  for (const batch of batches.rows) {
    if (remaining <= 0) break;

    const available = parseFloat(batch.units_remaining);
    const take = Math.min(remaining, available);
    const costPerUnit = parseFloat(batch.unit_cost_zmw);
    const batchCost = Math.round(take * costPerUnit * 100) / 100;

    // Deduct from inventory to prevent double-sell
    await query(
      `UPDATE float_inventory SET units_remaining = units_remaining - $1 WHERE id = $2`,
      [take, batch.id]
    );

    // Record which batches are held
    await query(
      `INSERT INTO float_reservation_batches (reservation_id, float_id, units_held, unit_cost_zmw)
       VALUES ($1, $2, $3, $4)`,
      [reservationId, batch.id, take, costPerUnit]
    );

    totalCost += batchCost;
    remaining -= take;
  }

  const alert = await getAlertLevel();
  return { success: true, reservationId, units, costZmw: totalCost, alert };
}


/**
 * Confirm a reservation — marks as "confirmed" (sold) and records float_transactions.
 * Called when the customer pays their trade credit order.
 *
 * @param {string}      reservationId  UUID of the reservation
 * @param {string|null} userId         Customer user ID
 * @param {string}      note           Audit note
 * @returns {Promise<{ success: boolean, costZmw: number }>}
 */
export async function confirmFloat(reservationId, userId, note) {
  const batchesResult = await query(
    `SELECT float_id, units_held, unit_cost_zmw
     FROM float_reservation_batches
     WHERE reservation_id = $1`,
    [reservationId]
  );

  let totalCost = 0;

  for (const rb of batchesResult.rows) {
    const units = parseFloat(rb.units_held);
    const cost = Math.round(units * parseFloat(rb.unit_cost_zmw) * 100) / 100;

    // Record the sale transaction (units already deducted during reservation)
    await query(
      `INSERT INTO float_transactions (float_id, transaction_type, units, amount_zmw, user_id, note)
       VALUES ($1, 'sale', $2, $3, $4, $5)`,
      [rb.float_id, -units, cost, userId, note]
    );

    totalCost += cost;
  }

  // Mark reservation as confirmed
  await query(
    `UPDATE float_reservations SET status = 'confirmed', resolved_at = now() WHERE id = $1`,
    [reservationId]
  );

  return { success: true, costZmw: totalCost };
}


/**
 * Release a reservation — returns held units back to float inventory.
 * Called when an order defaults or is cancelled.
 *
 * @param {string} reservationId  UUID of the reservation
 * @returns {Promise<{ success: boolean, unitsReleased: number }>}
 */
export async function releaseFloat(reservationId) {
  const batchesResult = await query(
    `SELECT float_id, units_held
     FROM float_reservation_batches
     WHERE reservation_id = $1`,
    [reservationId]
  );

  let totalReleased = 0;

  for (const rb of batchesResult.rows) {
    const units = parseFloat(rb.units_held);

    // Return units to the batch
    await query(
      `UPDATE float_inventory SET units_remaining = units_remaining + $1 WHERE id = $2`,
      [units, rb.float_id]
    );

    totalReleased += units;
  }

  // Mark reservation as released
  await query(
    `UPDATE float_reservations SET status = 'released', resolved_at = now() WHERE id = $1`,
    [reservationId]
  );

  return { success: true, unitsReleased: totalReleased };
}


/**
 * Get the current alert level based on total remaining units.
 * @returns {Promise<string|null>}
 */
async function getAlertLevel() {
  const result = await query(
    `SELECT COALESCE(SUM(units_remaining), 0) AS total
     FROM float_inventory
     WHERE units_remaining > 0`
  );
  const total = parseFloat(result.rows[0].total);
  if (total < CRITICAL_THRESHOLD) return 'CRITICAL';
  if (total < LOW_THRESHOLD)      return 'LOW';
  return null;
}
