/**
 * The OpenAI API key.
 *
 * Historically the codebase read TWO different variables: `OPENAI_API_KEY` (the
 * app, and the only one in .env.example) and `OPENAI_SECRET_KEY` (features/,
 * the health check, and docker-compose.prod.yml — documented as "same as
 * above"). Anyone who followed .env.example got a working app but silently dead
 * feature modules.
 *
 * Accept either, prefer the canonical name. `OPENAI_SECRET_KEY` is a deprecated
 * alias kept so existing deployments (and docker-compose.prod.yml) don't break.
 *
 * Read lazily — the worker loads .env after these modules are imported.
 */

export function openAiApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY || process.env.OPENAI_SECRET_KEY || undefined;
}

export function hasOpenAiKey(): boolean {
  return Boolean(openAiApiKey());
}
