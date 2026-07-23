import OpenAI from 'openai';
import { openAiApiKey } from '../openai-key';
import { lazyClient } from '../lazy-client';

const openai = lazyClient<OpenAI>(() => new OpenAI({
  apiKey: openAiApiKey(),
}));

export async function generateVideoScript(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a professional video script writer. Create engaging, concise scripts for video content.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content || '';
}

export async function generateVideoSummary(transcript: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a video content analyzer. Create concise, engaging summaries of video transcripts.',
      },
      {
        role: 'user',
        content: `Summarize this video transcript: ${transcript}`,
      },
    ],
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content || '';
}

export async function generateVideoTitle(description: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a video marketing expert. Create compelling, SEO-friendly video titles.',
      },
      {
        role: 'user',
        content: `Create a title for this video: ${description}`,
      },
    ],
    max_tokens: 100,
  });

  return completion.choices[0]?.message?.content || '';
}

export interface StoryboardSceneDraft {
  description: string;
  visuals: string;
  audio: string;
}

/**
 * Turn a raw video script into an ordered list of storyboard scenes via a real
 * LLM call (no placeholder scaffolding). Each scene has a short description, the
 * on-screen visuals, and the audio/voiceover.
 */
export async function generateStoryboardScenes(script: string): Promise<StoryboardSceneDraft[]> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          'You are a professional video storyboard artist. Break the given script into a sequence of distinct ' +
          'scenes. Respond with ONLY a JSON object shaped like ' +
          '{"scenes":[{"description":"...","visuals":"...","audio":"..."}]}. Use between 3 and 8 scenes. ' +
          '"description" is a short summary of the scene, "visuals" is what appears on screen, "audio" is the ' +
          'voiceover or sound. Output no markdown and no commentary outside the JSON.',
      },
      {
        role: 'user',
        content: `Script:\n${script}`,
      },
    ],
    max_tokens: 1200,
    temperature: 0.7,
  });

  return parseStoryboardScenes(completion.choices[0]?.message?.content || '');
}

/** Tolerantly parse the model's reply (it may wrap JSON in ``` fences or prose). */
function parseStoryboardScenes(raw: string): StoryboardSceneDraft[] {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  const jsonText = first !== -1 && last > first ? cleaned.slice(first, last + 1) : cleaned;

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('The model returned an unparseable storyboard. Please try again.');
  }

  const rawScenes = Array.isArray(parsed?.scenes)
    ? parsed.scenes
    : Array.isArray(parsed)
      ? parsed
      : [];

  const scenes: StoryboardSceneDraft[] = rawScenes
    .map((s: any) => ({
      description: String(s?.description ?? '').trim(),
      visuals: String(s?.visuals ?? '').trim(),
      audio: String(s?.audio ?? '').trim(),
    }))
    .filter((s: StoryboardSceneDraft) => s.description.length > 0);

  if (scenes.length === 0) {
    throw new Error('The model returned no usable scenes. Please try again.');
  }
  return scenes;
}

export interface AdHookOption {
  label: string;
  narration: string;
  searchQuery?: string;
}
export interface AdCtaOption {
  label: string;
  narration: string;
}
export interface AdHooksResult {
  hooks: AdHookOption[];
  ctas: AdCtaOption[];
  angles: string[];
}

/**
 * Ad Studio hook generator: from a product/offer brief + target platform, return
 * scroll-stopping video ad HOOKS (first ~3s), CTA lines, and creative angles —
 * shaped so they drop straight into the /api/campaigns/variations matrix
 * (label <= 40, narration <= 300, searchQuery <= 120).
 */
export async function generateAdHooks(brief: string, platform: string, count: number): Promise<AdHooksResult> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          'You are a direct-response video ad strategist. Given a product/offer brief and a target platform, produce ' +
          'scroll-stopping HOOKS (the first ~3 seconds of the ad), call-to-action lines, and creative angles. Use proven ' +
          'hook patterns: question, bold-claim, POV/relatable, problem-agitate, "3 reasons", pattern-interrupt, social-proof, ' +
          'before/after. Respond with ONLY JSON of the form ' +
          '{"hooks":[{"label":"...","narration":"...","searchQuery":"..."}],"ctas":[{"label":"...","narration":"..."}],"angles":["..."]}. ' +
          'Rules: label <= 40 chars and starts with "hook:" (e.g. "hook:question"); narration <= 300 chars (the spoken/on-screen hook ' +
          'line); searchQuery <= 120 chars (stock footage matching the hook). Return exactly the requested number of hooks, 3 ctas ' +
          '(labels start with "cta:"), and 4 short angles. No markdown, no commentary outside the JSON.',
      },
      {
        role: 'user',
        content: `Platform: ${platform}\nProduct/offer brief:\n${brief}\n\nGive ${count} distinct hooks.`,
      },
    ],
    max_tokens: 1400,
    temperature: 0.8,
  });
  return parseAdHooks(completion.choices[0]?.message?.content || '');
}

function clampStr(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

function parseAdHooks(raw: string): AdHooksResult {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  const jsonText = first !== -1 && last > first ? cleaned.slice(first, last + 1) : cleaned;

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('The model returned unparseable hooks. Please try again.');
  }

  const hooks: AdHookOption[] = (Array.isArray(parsed?.hooks) ? parsed.hooks : [])
    .map((h: any) => {
      const label = clampStr(h?.label, 40) || 'hook';
      const narration = clampStr(h?.narration, 300);
      const searchQuery = clampStr(h?.searchQuery, 120);
      return { label, narration, ...(searchQuery ? { searchQuery } : {}) };
    })
    .filter((h: AdHookOption) => h.narration.length > 0);

  const ctas: AdCtaOption[] = (Array.isArray(parsed?.ctas) ? parsed.ctas : [])
    .map((c: any) => ({ label: clampStr(c?.label, 40) || 'cta', narration: clampStr(c?.narration, 300) }))
    .filter((c: AdCtaOption) => c.narration.length > 0);

  const angles: string[] = (Array.isArray(parsed?.angles) ? parsed.angles : [])
    .map((a: any) => clampStr(a, 120))
    .filter((a: string) => a.length > 0);

  if (hooks.length === 0) {
    throw new Error('The model returned no usable hooks. Please try again.');
  }
  return { hooks, ctas, angles };
}





