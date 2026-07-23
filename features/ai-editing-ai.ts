// AI-Powered Video Editing — real analysis over a user's actual video.
//
// This module used to fabricate everything: `analyzeVideo` returned a hardcoded
// duration/scene list for ANY url, `generateAutoEditSuggestions` called OpenAI
// and then threw the response away in favor of a fixed array, and
// `applyVideoEdit` "processed" edits with `setTimeout` and returned made-up
// `https://forgevid.com/edited/*.mp4` URLs that were never written to disk.
//
// None of that touched a real video. Real video editing in this app happens by
// mutating the persisted scene list (lib/scene-ops.ts, the Scene Editor at
// /dashboard/editor) and re-encoding it (lib/generation-pipeline.ts,
// POST /api/videos/[videoId]/rerender). This module does what an LLM can
// honestly do on top of that: read a video's REAL persisted facts (title,
// duration, transcript, scene list) and produce real, actionable suggestions —
// each one pointing at a real place to act (the editor or a real re-render),
// never a fabricated file.

import OpenAI from 'openai';
import { openAiApiKey } from '@/lib/openai-key';
import { lazyClient } from '@/lib/lazy-client';
import { loadScenes } from '@/lib/generation-pipeline';
import { describeScenesForModel } from '@/lib/scene-ops';

const openai = lazyClient<OpenAI>(() => new OpenAI({
  apiKey: openAiApiKey(),
}));

/** The real, DB-backed facts about a video that we're allowed to reason about. */
export interface VideoContext {
  id: string;
  title: string;
  description?: string | null;
  duration?: number | null;
  transcript?: string | null;
  status?: string | null;
}

/**
 * Where a suggestion sends the user. There is no third option — this app has
 * no capability to apply an arbitrary edit and hand back a finished file from
 * this panel, so every suggestion resolves to a real, already-working surface.
 */
export type SuggestionAction = 'open_editor' | 'rerender';

export interface EditSuggestion {
  title: string;
  description: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  action: SuggestionAction;
}

export interface VideoAnalysis {
  videoId: string;
  title: string;
  duration: number | null;
  status: string | null;
  hasTranscript: boolean;
  sceneCount: number;
  /** Whether this video has persisted scenes to re-render (see lib/generation-pipeline.ts planRerender). */
  canRerender: boolean;
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  suggestions: EditSuggestion[];
}

/** Strip ```json fences / stray prose and parse the model's JSON object reply. */
function parseJsonObject(raw: string): any {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  const jsonText = first !== -1 && last > first ? cleaned.slice(first, last + 1) : cleaned;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function normalizePriority(value: unknown): 'high' | 'medium' | 'low' {
  const v = String(value ?? '').toLowerCase();
  return v === 'high' || v === 'low' ? v : 'medium';
}

/** The model is told the rerender rule, but we still enforce it — never trust it blind. */
function normalizeAction(value: unknown, canRerender: boolean): SuggestionAction {
  return String(value ?? '').toLowerCase() === 'rerender' && canRerender ? 'rerender' : 'open_editor';
}

function parseSuggestions(raw: unknown, canRerender: boolean): EditSuggestion[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((s: any) => ({
      title: String(s?.title ?? '').trim(),
      description: String(s?.description ?? '').trim(),
      rationale: String(s?.rationale ?? '').trim(),
      priority: normalizePriority(s?.priority),
      action: normalizeAction(s?.action, canRerender),
    }))
    .filter((s: EditSuggestion) => s.title.length > 0 && s.description.length > 0);
}

/** Pull the real, persisted facts we're allowed to hand the model. Never invented. */
async function gatherRealFacts(video: VideoContext) {
  const scenes = await loadScenes(video.id);
  const canRerender = scenes.length > 0;
  const hasTranscript = !!(video.transcript && video.transcript.trim().length > 0);

  const facts = [
    `Title: ${video.title}`,
    `Status: ${video.status ?? 'unknown'}`,
    `Duration: ${video.duration != null ? `${video.duration}s` : 'unknown (not set yet)'}`,
    video.description ? `Description: ${video.description}` : null,
    scenes.length > 0
      ? `Persisted scenes (real, from the render pipeline — id, order, duration, on-screen description):\n${describeScenesForModel(scenes)}`
      : 'No persisted scene list is available for this video yet.',
    hasTranscript
      ? `Transcript:\n${video.transcript}`
      : 'No transcript is available for this video — do not invent or assume spoken content.',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { facts, scenes, canRerender, hasTranscript };
}

const ACTION_RULE =
  'Set "action" to "rerender" ONLY for a suggestion that means "re-render / finalize the video as it is ' +
  'already edited" — use that when persisted scenes exist and the fix is just producing a fresh render. ' +
  'Every other suggestion — trimming, re-ordering, changing narration or on-screen text, swapping footage, ' +
  'adjusting pacing — requires editing scenes and must use "action":"open_editor". Never claim a suggestion ' +
  'was already applied.';

export async function analyzeVideo(video: VideoContext): Promise<VideoAnalysis> {
  const { facts, scenes, canRerender, hasTranscript } = await gatherRealFacts(video);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          'You are a video editing assistant reviewing ONE real video for its owner. Base your review strictly on ' +
          'the facts given below — never invent resolution, frame rate, exact scene timestamps, or transcript ' +
          'content that was not provided. If a transcript is missing, say so and base the review on the title, ' +
          'description, and scene list only. Respond with ONLY a JSON object shaped like ' +
          '{"summary":"...","strengths":["..."],"improvementAreas":["..."],"suggestions":[{"title":"...",' +
          '"description":"...","rationale":"...","priority":"high|medium|low","action":"open_editor|rerender"}]}. ' +
          `${ACTION_RULE} This video ${canRerender ? 'DOES have' : 'does NOT have'} persisted scenes, so ` +
          `${canRerender ? '"rerender" is a valid action here' : 'never use "rerender" for it'}. Provide 2-5 suggestions.`,
      },
      { role: 'user', content: facts },
    ],
    max_tokens: 900,
    temperature: 0.5,
  });

  const parsed = parseJsonObject(completion.choices[0]?.message?.content || '');
  if (!parsed) {
    throw new Error('The model returned an unparseable analysis. Please try again.');
  }

  return {
    videoId: video.id,
    title: video.title,
    duration: video.duration ?? null,
    status: video.status ?? null,
    hasTranscript,
    sceneCount: scenes.length,
    canRerender,
    summary: String(parsed.summary ?? '').trim() || 'The model did not return a summary.',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map((s: unknown) => String(s)).filter(Boolean) : [],
    improvementAreas: Array.isArray(parsed.improvementAreas)
      ? parsed.improvementAreas.map((s: unknown) => String(s)).filter(Boolean)
      : [],
    suggestions: parseSuggestions(parsed.suggestions, canRerender),
  };
}

/**
 * Auto-edit suggestions driven by a free-text user prompt, in the context of a
 * real video. Actually uses the model's response (the old version threw it away
 * and returned a fixed array regardless of what the model said).
 */
export async function generateAutoEditSuggestions(
  video: VideoContext,
  prompt: string,
): Promise<EditSuggestion[]> {
  const { facts, canRerender } = await gatherRealFacts(video);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          'You are a professional video editor AI helping with ONE real video. Use only the facts given below — ' +
          'never invent technical details or spoken content that was not provided. Respond with ONLY a JSON ' +
          'object shaped like {"suggestions":[{"title":"...","description":"...","rationale":"...",' +
          `"priority":"high|medium|low","action":"open_editor|rerender"}]}. ${ACTION_RULE} This video ` +
          `${canRerender ? 'DOES have' : 'does NOT have'} persisted scenes, so ` +
          `${canRerender ? '"rerender" is a valid action here' : 'never use "rerender" for it'}. Provide 2-5 suggestions ` +
          "that directly address the user's request.",
      },
      { role: 'user', content: `${facts}\n\nThe user's edit request: "${prompt}"` },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });

  const raw = completion.choices[0]?.message?.content || '';
  const parsed = parseJsonObject(raw);
  const suggestions = parseSuggestions(parsed?.suggestions ?? parsed, canRerender);

  if (suggestions.length === 0) {
    throw new Error('The model returned no usable suggestions. Please try again.');
  }
  return suggestions;
}
