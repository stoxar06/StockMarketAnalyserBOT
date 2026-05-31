import { chat, modelFor, type LlmProvider } from "../src/llm";

/**
 * Quick connectivity test for the configured LLM providers.
 * Verifies your Groq / OpenRouter keys + model ids work.
 *
 * NOTE: this is purely a helper/analysis test — the LLM is never used to make
 * trade decisions (see the header comment in src/llm.ts).
 *
 * Usage: add GROQ_API_KEY / OPENROUTER_API_KEY to .env, then `npm run llm:test`.
 */
async function testProvider(provider: LlmProvider): Promise<void> {
  process.stdout.write(`\n[${provider}] model=${modelFor(provider)}\n  → calling... `);
  try {
    const reply = await chat(
      [
        { role: "system", content: "You are a terse assistant." },
        { role: "user", content: "Reply with exactly one word: pong" },
      ],
      { provider, temperature: 0 },
    );
    console.log("OK:", JSON.stringify(reply.trim().slice(0, 120)));
  } catch (err) {
    console.log("FAILED:", err instanceof Error ? err.message : String(err));
  }
}

async function main(): Promise<void> {
  console.log("Testing LLM providers (analysis/research helper — NOT for trade decisions).");
  await testProvider("groq");
  await testProvider("openrouter");
  console.log("\nDone. (A FAILED line usually means a missing key or a retired model id —");
  console.log("set GROQ_MODEL / OPENROUTER_MODEL in .env to a current model if needed.)");
}

main();
