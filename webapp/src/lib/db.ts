import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { CosmosData } from "@/core/types";
import { buildEnvelope, emptyData } from "@/core/persistence";

// Lazily initialised so the module can be imported at build time without
// DATABASE_URL being present. The function throws at runtime if the env var
// is missing, which is the right behaviour.
let _sql: NeonQueryFunction<false, false> | null = null;
function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set.");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

/** Load the CosmosData envelope for a user. Returns emptyData() on first visit. */
export async function loadUserData(
  userId: string,
): Promise<{ data: CosmosData; fresh: boolean }> {
  const sql = getSql();
  const rows = await sql`
    SELECT data FROM user_data WHERE user_id = ${userId}
  `;
  if (rows.length === 0) {
    return { data: emptyData(), fresh: true };
  }
  // data is stored as JSONB; neon returns it already parsed.
  const envelope = rows[0].data as any;
  // Migration path: if DB row is raw CosmosData, treat as v1.
  if (envelope && !("schemaVersion" in envelope)) {
    return { data: envelope as CosmosData, fresh: false };
  }
  return { data: envelope.data as CosmosData, fresh: false };
}

/** Upsert the CosmosData envelope for a user (atomic replace). */
export async function saveUserData(
  userId: string,
  email: string,
  data: CosmosData,
): Promise<void> {
  const sql = getSql();
  const envelope = buildEnvelope(data);
  const json = JSON.stringify(envelope);
  await sql`
    INSERT INTO user_data (user_id, email, data)
    VALUES (${userId}, ${email}, ${json})
    ON CONFLICT (user_id)
    DO UPDATE SET data = ${json}, updated_at = NOW()
  `;
}

/** Returns how many times a user has called an AI endpoint today. */
export async function getAiUsage(
  userId: string,
  endpoint: "mark" | "generate",
): Promise<number> {
  const sql = getSql();
  const rows = await sql`
    SELECT mark_calls, generate_calls
    FROM ai_usage
    WHERE user_id = ${userId} AND date = CURRENT_DATE
  `;
  if (rows.length === 0) return 0;
  return (endpoint === "mark"
    ? rows[0].mark_calls
    : rows[0].generate_calls) as number;
}

/**
 * AI rate limiting: returns how many times a user has called an AI endpoint
 * today, and increments the counter atomically. Returns the new count.
 * Callers should check the count BEFORE deciding to proceed.
 */
export async function incrementAiUsage(
  userId: string,
  endpoint: "mark" | "generate"
): Promise<number> {
  const sql = getSql();
  // Neon tagged templates don't support dynamic identifier interpolation,
  // so we branch on the two known column names rather than building a
  // dynamic query.
  const rows =
    endpoint === "mark"
      ? await sql`
          INSERT INTO ai_usage (user_id, date, mark_calls)
          VALUES (${userId}, CURRENT_DATE, 1)
          ON CONFLICT (user_id, date)
          DO UPDATE SET mark_calls = ai_usage.mark_calls + 1
          RETURNING mark_calls AS count
        `
      : await sql`
          INSERT INTO ai_usage (user_id, date, generate_calls)
          VALUES (${userId}, CURRENT_DATE, 1)
          ON CONFLICT (user_id, date)
          DO UPDATE SET generate_calls = ai_usage.generate_calls + 1
          RETURNING generate_calls AS count
        `;
  return rows[0].count as number;
}

export async function getSubscription(userId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM subscriptions WHERE user_id = ${userId}
  `;
  if (rows.length === 0) return null;
  return rows[0];
}

export async function getSubscriptionByCustomerId(customerId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM subscriptions WHERE stripe_customer_id = ${customerId}
  `;
  if (rows.length === 0) return null;
  return rows[0];
}


export async function upsertSubscription(userId: string, fields: any) {
  const sql = getSql();
  const keys = Object.keys(fields);
  const values = Object.values(fields);

  // Hand-rolled upsert for simple fields
  await sql`
    INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_price_id, status, period_end, updated_at)
    VALUES (
      ${userId},
      ${fields.stripe_customer_id},
      ${fields.stripe_price_id},
      ${fields.status},
      ${fields.period_end},
      NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_price_id = EXCLUDED.stripe_price_id,
      status = EXCLUDED.status,
      period_end = EXCLUDED.period_end,
      updated_at = NOW()
  `;
}

