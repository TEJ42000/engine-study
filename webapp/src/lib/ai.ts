/**
 * Auggie SDK wrapper for server-side AI calls.
 *
 * Uses the AI SDK Provider mode — no local Auggie installation required.
 * Credentials come from the AUGMENT_SESSION_AUTH environment variable
 * (set in Vercel encrypted env vars; see .env.example).
 *
 * Model tiers (cost-cautious per spec §4.2):
 *   Marking  → claude-haiku-4-5  (~$0.003–0.005 / call after caching)
 *   Generate → claude-sonnet-4-6 (~$0.08 / call)
 */
import {
  AugmentLanguageModel,
  resolveAugmentCredentials,
  type AugmentCredentials,
} from "@augmentcode/auggie-sdk";
import { generateText } from "ai";

// Credentials are resolved once at module load; the serverless function
// is warm-reused within the same instance so this runs infrequently.
let credentialsPromise: Promise<AugmentCredentials> | null = null;

// The SDK's resolveAugmentCredentials() only reads AUGMENT_API_TOKEN /
// AUGMENT_API_URL or ~/.augment/session.json. In serverless (Vercel) we
// carry the session as a single AUGMENT_SESSION_AUTH JSON blob
// ({ accessToken, tenantURL }), so parse it and pass credentials explicitly.
async function getCredentials(): Promise<AugmentCredentials> {
  if (!credentialsPromise) {
    const raw = process.env.AUGMENT_SESSION_AUTH;
    if (raw) {
      let parsed: { accessToken?: string; tenantURL?: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(
          "AUGMENT_SESSION_AUTH is set but is not valid JSON; expected { accessToken, tenantURL }",
        );
      }
      if (!parsed.accessToken || !parsed.tenantURL) {
        throw new Error(
          "AUGMENT_SESSION_AUTH is missing accessToken or tenantURL",
        );
      }
      credentialsPromise = Promise.resolve({
        apiKey: parsed.accessToken,
        apiUrl: parsed.tenantURL,
      });
    } else {
      credentialsPromise = resolveAugmentCredentials();
    }
  }
  return credentialsPromise;
}

/** Create an AugmentLanguageModel for a given model name. */
export async function getModel(modelId: string): Promise<AugmentLanguageModel> {
  const creds = await getCredentials();
  return new AugmentLanguageModel(modelId, creds);
}

/** Model IDs used by this app — change here to swap globally. */
export const MODELS = {
  /** Recall marking: cheap, fast, bounded rubric task. */
  marking: "claude-haiku-4-5",
  /** Engine generation: structured, quality-sensitive, infrequent. */
  generation: "claude-sonnet-4-6",
} as const;

/** Thin wrapper: one-shot prompt → text. Caller builds system + prompt. */
export async function oneShot(opts: {
  modelId: string;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const model = await getModel(opts.modelId);
  const { text } = await generateText({
    model,
    system: opts.system,
    prompt: opts.prompt,
    maxOutputTokens: opts.maxTokens ?? 600,
  });
  return text;
}
