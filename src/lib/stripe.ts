import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return stripeClient;
};

export const getPlatformFeePercent = () => {
  const raw = process.env.STRIPE_CONNECT_PLATFORM_FEE_PERCENT;
  const parsed = Number(raw ?? "5");
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
};

export const calculatePlatformFeeAmount = (amountCents: number) => {
  const percent = getPlatformFeePercent();
  return Math.round(amountCents * (percent / 100));
};
