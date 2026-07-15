import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === "production") {
  console.warn("STRIPE_SECRET_KEY is not set in production");
}

export const stripe = new Stripe(key, {
  apiVersion: "2025-02-24-preview" as any,
});
