/**
 * Provider-agnostic text-LLM client — OpenAI or Google Gemini.
 *
 * Gemini exposes an OpenAI-COMPATIBLE endpoint, so every existing call site
 * keeps using the OpenAI SDK unchanged; only the client's baseURL/key and the
 * model name switch. Selection:
 *
 *   LLM_PROVIDER=gemini | openai   — explicit choice (needs that provider's key)
 *   (unset)                        — auto: OpenAI if OPENAI_API_KEY, else Gemini
 *
 * Keys: OPENAI_API_KEY (or legacy OPENAI_SECRET_KEY) / GEMINI_API_KEY (or
 * GOOGLE_API_KEY). Model overrides: GEMINI_MODEL, GEMINI_FAST_MODEL.
 *
 * Scope: TEXT completions only. Whisper transcription, DALL-E images and the
 * moderation endpoint have no Gemini equivalent on the compat layer and stay on
 * OpenAI (their call sites keep using openAiApiKey() directly).
 */
import OpenAI from 'openai';
import { openAiApiKey } from '../openai-key';
import { lazyClient } from '../lazy-client';

export type LlmProvider = 'openai' | 'gemini';

export function geminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || undefined;
}

export function llmProvider(): LlmProvider {
  const forced = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (forced === 'gemini' && geminiApiKey()) return 'gemini';
  if (forced === 'openai' && openAiApiKey()) return 'openai';
  // Auto-detect: keep the historical default (OpenAI) when both are set.
  if (openAiApiKey()) return 'openai';
  if (geminiApiKey()) return 'gemini';
  return 'openai';
}

/** Is ANY text-LLM provider configured? (Gates that used hasOpenAiKey().) */
export function hasLlmKey(): boolean {
  return Boolean(openAiApiKey() || geminiApiKey());
}

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

/** Construct a fresh client for the active provider (rarely needed directly). */
export function createLlmClient(): OpenAI {
  if (llmProvider() === 'gemini') {
    return new OpenAI({ apiKey: geminiApiKey(), baseURL: GEMINI_BASE_URL });
  }
  return new OpenAI({ apiKey: openAiApiKey() });
}

/** Shared lazy client — import this instead of constructing new OpenAI(...). */
export const llm = lazyClient<OpenAI>(createLlmClient);

/**
 * The model name for the active provider. 'standard' replaces gpt-4-class
 * calls; 'fast' replaces gpt-4o-mini / gpt-3.5-turbo-class calls.
 */
export function llmModel(tier: 'standard' | 'fast' = 'standard'): string {
  if (llmProvider() === 'gemini') {
    return tier === 'fast'
      ? process.env.GEMINI_FAST_MODEL || 'gemini-2.5-flash'
      : process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }
  return tier === 'fast' ? 'gpt-4o-mini' : 'gpt-4';
}
