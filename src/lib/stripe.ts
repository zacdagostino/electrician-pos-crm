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
