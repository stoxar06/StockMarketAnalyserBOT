import dotenv from "dotenv";

dotenv.config();

/**
 * Provider-agnostic LLM client for Groq and OpenRouter (both OpenAI-compatible).
 *
 * IMPORTANT — scope of use:
 * This is a helper for ANALYSIS, EXPLANATIONS, and RESEARCH only. It must NEVER
 * be used to make buy/sell decisions. LLMs are non-deterministic, can hallucinate,
 * add latency, and cannot be backtested — trade logic stays rule-based and tested.
 */

export type LlmProvider = "groq" | "openrouter";

interface ProviderConfig {
  baseUrl: string;
  apiKey: string | undefined;
  defaultModel: string;
  /** Extra headers (OpenRouter likes attribution headers). */
  extraHeaders?: Record<string, string>;
}

const PROVIDERS: Record<LlmProvider, ProviderConfig> = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
    // Override with GROQ_MODEL in .env if this id is retired.
    defaultModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    // Override with OPENROUTER_MODEL in .env if this id is retired.
    defaultModel: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free",
    extraHeaders: {
      "HTTP-Referer": "https://github.com/stoxar06/StockMarketAnalyserBOT",
      "X-Title": "StockMarketAnalyserBOT",
    },
  },
};

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  provider?: LlmProvider;
  model?: string;
  temperature?: number;
}

/** The model id that will be used for a given provider (after .env overrides). */
export function modelFor(provider: LlmProvider): string {
  return PROVIDERS[provider].defaultModel;
}

/**
 * Send a chat completion to Groq or OpenRouter and return the assistant text.
 * Throws a clear error if the key is missing or the API rejects the request.
 */
export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const provider = opts.provider ?? "groq";
  const cfg = PROVIDERS[provider];
  if (!cfg.apiKey) {
    const envName = provider === "groq" ? "GROQ_API_KEY" : "OPENROUTER_API_KEY";
    throw new Error(`Missing ${envName} in .env (needed for the ${provider} provider).`);
  }
  const model = opts.model ?? cfg.defaultModel;

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
      ...(cfg.extraHeaders ?? {}),
    },
    body: JSON.stringify({ model, messages, temperature: opts.temperature ?? 0.2 }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${provider} API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}
