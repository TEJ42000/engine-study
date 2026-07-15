import { stripe } from "@/lib/stripe";
import { upsertSubscription, getSubscriptionByCustomerId } from "@/lib/db";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object as any;

  if (event.type === "checkout.session.completed") {
    const subscription = (await stripe.subscriptions.retrieve(session.subscription)) as any;
    await upsertSubscription(session.metadata.userId, {
      stripe_customer_id: session.customer,
      stripe_price_id: subscription.items.data[0].price.id,
      status: subscription.status,
      period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    const subscription = (await stripe.subscriptions.retrieve(session.subscription)) as any;
    const sub = await getSubscriptionByCustomerId(session.customer as string);
    if (sub) {
      await upsertSubscription(sub.user_id, {
        stripe_customer_id: session.customer,
        stripe_price_id: subscription.items.data[0].price.id,
        status: subscription.status,
        period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });
    }
  }

  return new Response(null, { status: 200 });
}
