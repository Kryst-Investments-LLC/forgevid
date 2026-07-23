/**
 * Turn a website into a commercial script.
 *
 * The model gets ONLY what we actually read off the page (lib/site-extract).
 * It is told, explicitly, not to invent facts — a promo that claims a fake
 * feature or a fake price is worse than no promo. Output is validated by Zod
 * before it can reach the renderer; a malformed reply fails visibly.
 *
 * Relative imports only — reachable from the worker process.
 */

import { z } from 'zod';
import { createLlmClient, hasLlmKey, llmModel } from './ai/llm';
import { briefForModel, type SiteContent } from './site-extract';

export const COMMERCIAL_TONES = ['energetic', 'professional', 'friendly', 'premium'] as const;
export type CommercialTone = (typeof COMMERCIAL_TONES)[number];

/**
 * The narration is what gets spoken; `beats` are the visual ideas the scene
 * planner will expand. Keeping them separate stops the planner from narrating
 * stage directions ("cut to a laptop").
 */
export const commercialScriptSchema = z.object({
  brand: z.string().min(1).max(80),
  tagline: z.string().min(1).max(120),
  narration: z.string().min(20).max(1200),
  beats: z.array(z.string().min(3).max(160)).min(2).max(8),
  callToAction: z.string().min(2).max(120),
});

export type CommercialScript = z.infer<typeof commercialScriptSchema>;

const TONE_GUIDANCE: Record<CommercialTone, string> = {
  energetic: 'Punchy, urgent, short sentences. Momentum over elegance.',
  professional: 'Precise and credible. No hype words, no exclamation marks.',
  friendly: 'Warm and conversational, like explaining it to a friend.',
  premium: 'Calm, spare, confident. Fewer words, more weight.',
};

/** ~2.6 words per second of speech is a realistic narration pace. */
export function narrationWordBudget(durationSeconds: number): number {
  return Math.max(12, Math.round(durationSeconds * 2.6));
}

export function buildScriptPrompt(
  content: SiteContent,
  duration: number,
  tone: CommercialTone,
): string {
  const words = narrationWordBudget(duration);
  const beats = Math.max(2, Math.min(8, Math.round(duration / 4)));
  return [
    `Write a ${duration}-second commercial for this product, using ONLY the information below.`,
    '',
    briefForModel(content),
    '',
    'Rules:',
    `- Tone: ${TONE_GUIDANCE[tone]}`,
    `- "narration" is the spoken voiceover: about ${words} words. It must read aloud naturally.`,
    `- "beats" are ${beats} visual scene ideas, each a concrete filmable image (e.g. "a freelancer smiling at a paid invoice notification"). No camera directions, no text overlays.`,
    '- Never invent facts, features, prices, statistics, customer names or awards that are not in the information above. If the page is vague, stay vague.',
    '- "callToAction" should reflect what the page actually asks visitors to do.',
    '',
    'Respond with JSON: {"brand","tagline","narration","beats":[],"callToAction"}',
  ].join('\n');
}

/**
 * The narration is what the voiceover will speak, and the beats are what the
 * scene planner will shoot. Feeding both to planScenes keeps the visuals on
 * message without the narrator reading stage directions.
 */
export function scriptToGenerationPrompt(script: CommercialScript): string {
  return [
    `${script.brand} — ${script.tagline}`,
    '',
    script.narration,
    '',
    `Scenes: ${script.beats.join('. ')}.`,
    `Ending: ${script.callToAction}`,
  ].join('\n');
}

export async function writeCommercialScript(
  content: SiteContent,
  options: { duration: number; tone: CommercialTone },
): Promise<CommercialScript> {
  if (!hasLlmKey()) {
    throw new Error('Script writing is unavailable (no LLM key: set OPENAI_API_KEY or GEMINI_API_KEY)');
  }

  const openai = createLlmClient();
  const completion = await openai.chat.completions.create({
    model: llmModel('fast'),
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 2048,
    messages: [
      {
        role: 'system',
        content:
          'You are a commercial copywriter. You write short, concrete video scripts ' +
          'grounded strictly in the source material you are given. You never fabricate ' +
          'product claims. You always reply with a single JSON object.',
      },
      { role: 'user', content: buildScriptPrompt(content, options.duration, options.tone) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('The scriptwriter returned nothing');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The scriptwriter returned malformed JSON');
  }

  const validated = commercialScriptSchema.safeParse(parsed);
  if (!validated.success) {
    // Fail visibly: a half-formed script would silently become a bad video.
    throw new Error(
      `The scriptwriter returned an unusable script: ${validated.error.issues
        .map((i) => i.path.join('.') || 'root')
        .join(', ')}`,
    );
  }
  return validated.data;
}
