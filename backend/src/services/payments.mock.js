// ── Mock mobile-money payment service ──

/**
 * Process a payment via MTN MoMo or Airtel Money.
 * In mock mode, every payment succeeds immediately.
 */
export function processPayment({ method, phone, amount }) {
  const reference = `RB-${method.toUpperCase()}-${Date.now()}`;
  console.log(`[mock-payments] ${method} payment of ZMW ${amount} from ${phone} → ref ${reference}`);

  return {
    success: true,
    reference,
    method,
    amount,
    mock: true,
  };
}
