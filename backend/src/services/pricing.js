// ── Pricing engine ──
// Calculates costs and fees for both Tier 1 (Trade Credit) and Tier 2 (Loan Credit).
// All rates are pulled from the admin-configurable settings table.

import { query } from '../config/db.js';
import { getPricingConfig } from './settings.js';

const round2 = (n) => Math.round(n * 100) / 100;

// ═════════════════════════════════════════════════════════════════════════════
// Tier 1 — Trade Credit pricing
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Calculate full cost breakdown for a Tier 1 trade credit purchase.
 *
 * @param {number} electricityAmtZmw  Electricity value in ZMW (before fee)
 * @returns {Promise<object>}
 */
export async function calculateTradeCredit(electricityAmtZmw) {
  const cfg = await getPricingConfig();
  const floatCost = await getWeightedFloatCost();

  const unitsKwh       = round2(electricityAmtZmw * cfg.kwhPerZmw);
  const serviceFee     = round2(electricityAmtZmw * cfg.serviceFeeRate);
  const totalCustomer  = round2(electricityAmtZmw + serviceFee);

  // Margin: what we charge (retail) vs what the float cost us
  const retailCost     = round2(unitsKwh * cfg.retailRatePerKwh);   // = electricityAmtZmw
  const floatCostTotal = round2(unitsKwh * floatCost.weightedAvg);
  const grossMargin    = round2(retailCost - floatCostTotal + serviceFee);
  const marginPct      = floatCostTotal > 0
    ? round2(((grossMargin / (floatCostTotal)) * 100))
    : 0;

  return {
    tier: 'trade_credit',
    electricity_zmw:    electricityAmtZmw,
    units_kwh:          unitsKwh,
    service_fee_zmw:    serviceFee,
    service_fee_rate:   `${cfg.serviceFeeRate * 100}%`,
    total_customer_zmw: totalCustomer,
    cost_breakdown: {
      retail_rate_per_kwh:   cfg.retailRatePerKwh,
      float_cost_per_kwh:    floatCost.weightedAvg,
      float_cost_total_zmw:  floatCostTotal,
      gross_margin_zmw:      grossMargin,
      gross_margin_pct:      `${marginPct}%`,
    },
    rates: {
      retail_rate_per_kwh: cfg.retailRatePerKwh,
      service_fee_rate:    cfg.serviceFeeRate,
      kwh_per_zmw:         cfg.kwhPerZmw,
    },
  };
}


// ═════════════════════════════════════════════════════════════════════════════
// Tier 2 — Loan Credit pricing
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Calculate full cost breakdown for a Tier 2 loan.
 *
 * @param {number} loanAmountZmw  Loan principal in ZMW
 * @param {object} [userInfo]     Optional user info with credit_limit
 * @returns {Promise<object>}
 */
export async function calculateLoanCredit(loanAmountZmw, userInfo = {}) {
  const cfg = await getPricingConfig();
  const floatCost = await getWeightedFloatCost();

  // Loan fee
  let loanFee;
  let feeLabel;
  if (cfg.loanFeeType === 'flat') {
    loanFee  = cfg.loanFlatFeeZmw;
    feeLabel = `ZMW ${cfg.loanFlatFeeZmw} flat fee`;
  } else {
    loanFee  = round2(loanAmountZmw * cfg.loanFeeRate);
    feeLabel = `${cfg.loanFeeRate * 100}% per ${cfg.loanPeriodDays}-day period`;
  }

  const totalRepayment = round2(loanAmountZmw + loanFee);

  // Early repayment discount
  const earlyDiscount     = round2(totalRepayment * cfg.earlyRepaymentDiscount);
  const earlyRepayTotal   = round2(totalRepayment - earlyDiscount);

  // kWh delivered
  const unitsKwh = round2(loanAmountZmw * cfg.kwhPerZmw);

  // Margin
  const floatCostTotal = round2(unitsKwh * floatCost.weightedAvg);
  const grossMargin    = round2(loanFee + (loanAmountZmw - floatCostTotal));
  const marginPct      = floatCostTotal > 0
    ? round2(((grossMargin / floatCostTotal) * 100))
    : 0;

  // Due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + cfg.loanPeriodDays);

  return {
    tier: 'loan_credit',
    loan_amount_zmw:       loanAmountZmw,
    units_kwh:             unitsKwh,
    loan_fee_zmw:          loanFee,
    loan_fee_label:        feeLabel,
    total_repayment_zmw:   totalRepayment,
    early_repayment: {
      if_repaid_within_days:  cfg.earlyRepaymentDays,
      discount_rate:          `${cfg.earlyRepaymentDiscount * 100}%`,
      discount_zmw:           earlyDiscount,
      total_if_early_zmw:     earlyRepayTotal,
    },
    due_date:              dueDate.toISOString().split('T')[0],
    loan_period_days:      cfg.loanPeriodDays,
    cost_breakdown: {
      retail_rate_per_kwh:   cfg.retailRatePerKwh,
      float_cost_per_kwh:    floatCost.weightedAvg,
      float_cost_total_zmw:  floatCostTotal,
      gross_margin_zmw:      grossMargin,
      gross_margin_pct:      `${marginPct}%`,
    },
    ...(userInfo.credit_limit && {
      credit: {
        approved_limit_zmw:     userInfo.credit_limit,
        available_zmw:          userInfo.available_credit ?? userInfo.credit_limit,
      },
    }),
    rates: {
      loan_fee_rate:         cfg.loanFeeRate,
      loan_fee_type:         cfg.loanFeeType,
      early_repayment_discount: cfg.earlyRepaymentDiscount,
      retail_rate_per_kwh:   cfg.retailRatePerKwh,
      kwh_per_zmw:           cfg.kwhPerZmw,
    },
  };
}


// ═════════════════════════════════════════════════════════════════════════════
// Margin reporting — blended across tiers
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Calculate blended margin report across both tiers.
 * Uses recent transaction history from float_transactions.
 *
 * @returns {Promise<object>}
 */
export async function getMarginReport() {
  const cfg = await getPricingConfig();
  const floatCost = await getWeightedFloatCost();

  // Total revenue from trade credit fees
  const tcFeeResult = await query(
    `SELECT COALESCE(SUM(fee_amount_zmw), 0) AS total_fees,
            COUNT(*) AS fee_count
     FROM fee_revenue
     WHERE fee_type = 'trade_credit_service'`
  );
  const tcFees     = parseFloat(tcFeeResult.rows[0].total_fees);
  const tcFeeCount = parseInt(tcFeeResult.rows[0].fee_count, 10);

  // Total float units sold (absolute value)
  const soldResult = await query(
    `SELECT COALESCE(SUM(ABS(units)), 0)    AS total_units_sold,
            COALESCE(SUM(amount_zmw), 0)     AS total_cost_zmw,
            COUNT(*)                          AS sale_count
     FROM float_transactions
     WHERE transaction_type = 'sale'`
  );
  const totalUnitsSold = parseFloat(soldResult.rows[0].total_units_sold);
  const totalCostZmw   = parseFloat(soldResult.rows[0].total_cost_zmw);
  const saleCount      = parseInt(soldResult.rows[0].sale_count, 10);

  // Revenue at retail
  const retailRevenue = round2(totalUnitsSold * cfg.retailRatePerKwh);

  // Gross margin = (retail revenue - float cost) + service fees
  const spreadMargin = round2(retailRevenue - totalCostZmw);
  const totalMargin  = round2(spreadMargin + tcFees);
  const marginPct    = totalCostZmw > 0
    ? round2((totalMargin / totalCostZmw) * 100)
    : 0;

  return {
    float_cost: {
      weighted_avg_per_kwh:  floatCost.weightedAvg,
      total_units_sold:      round2(totalUnitsSold),
      total_cost_zmw:        round2(totalCostZmw),
    },
    retail: {
      rate_per_kwh:          cfg.retailRatePerKwh,
      total_revenue_zmw:     retailRevenue,
    },
    service_fees: {
      trade_credit_total_zmw: round2(tcFees),
      transaction_count:      tcFeeCount,
    },
    blended_margin: {
      spread_margin_zmw:     spreadMargin,
      fee_revenue_zmw:       round2(tcFees),
      total_margin_zmw:      totalMargin,
      margin_pct:            `${marginPct}%`,
    },
    rates: {
      retail_rate_per_kwh:   cfg.retailRatePerKwh,
      service_fee_rate:      cfg.serviceFeeRate,
      loan_fee_rate:         cfg.loanFeeRate,
    },
  };
}


// ═════════════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get the current weighted-average float cost per kWh.
 * Calculated from all inventory batches with remaining stock.
 *
 * @returns {Promise<{ weightedAvg: number, totalUnits: number, totalCost: number }>}
 */
async function getWeightedFloatCost() {
  const result = await query(
    `SELECT
       COALESCE(SUM(units_remaining), 0)                    AS total_units,
       COALESCE(SUM(units_remaining * unit_cost_zmw), 0)    AS total_cost
     FROM float_inventory
     WHERE units_remaining > 0`
  );

  const totalUnits = parseFloat(result.rows[0].total_units);
  const totalCost  = parseFloat(result.rows[0].total_cost);
  const weightedAvg = totalUnits > 0 ? round2(totalCost / totalUnits) : 2.50;

  return { weightedAvg, totalUnits: round2(totalUnits), totalCost: round2(totalCost) };
}
