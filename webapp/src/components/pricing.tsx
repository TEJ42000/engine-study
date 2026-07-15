"use client";
import { useState } from "react";

const PLANS = [
  {
    name: "Pro",
    price: "$19",
    priceId: "price_PRO_ID_HERE",
    features: ["Unlimited Engines", "Unlimited AI Extractions", "Advanced Spaced Repetition", "Priority Support"]
  }
];

export function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(priceId: string) {
    setLoading(priceId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 mt-16 max-w-sm mx-auto">
      {PLANS.map((plan) => (
        <div key={plan.name} className="rounded-2xl border border-zinc-200 p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
          <p className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight text-zinc-900">{plan.price}</span>
            <span className="text-sm font-semibold text-zinc-500">/month</span>
          </p>
          <ul className="mt-8 space-y-3 text-sm text-zinc-600">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-3">
                <span className="text-zinc-400">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleCheckout(plan.priceId)}
            disabled={!!loading}
            className="mt-8 block w-full rounded-lg bg-zinc-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {loading === plan.priceId ? "Redirecting..." : "Get started"}
          </button>
        </div>
      ))}
    </div>
  );
}
