// Billing remains disabled during the beta. Entitlements must be issued by a verified payment backend.
export async function purchaseProPlan(): Promise<never> {
  throw new Error("Los pagos no están habilitados en esta beta.");
}
