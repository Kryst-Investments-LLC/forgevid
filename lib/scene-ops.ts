/**
 * Structured scene edits — the safe half of chat-based editing.
 *
 * The model never mutates scenes. It only proposes OPERATIONS from a closed set,
 * which are validated with zod and applied here by a pure function. That keeps
 * the LLM out of the data model: an invented field, an unknown scene id, or a
 * 900-second scene is rejected rather than persisted.
 *
 * Relative imports only — reachable from the worker process.
 */

import { z } from 'zod';
import type { ResolvedScene } from './video-generator';

export const MIN_SCENE_DURATION = 1;
export const MAX_SCENE_DURATION = 120;

export const sceneOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('set_duration'),
    sceneId: z.string().min(1),
    duration: z.number().min(MIN_SCENE_DURATION).max(MAX_SCENE_DURATION),
  }),
  z.object({
    op: z.literal('set_description'),
    sceneId: z.string().min(1),
    description: z.string().min(1).max(500),
  }),
  z.object({ op: z.literal('swap_clip'), sceneId: z.string().min(1) }),
  z.object({ op: z.literal('delete_scene'), sceneId: z.string().min(1) }),
]);

export type SceneOp = z.infer<typeof sceneOpSchema>;

export const sceneOpsSchema = z.object({
  /** What the assistant wants to say back to the user. */
  reply: z.string().max(500).default(''),
  operations: z.array(sceneOpSchema).max(20),
});

export interface ApplyResult {
  scenes: ResolvedScene[];
  /** Operations that were applied verbatim. */
  applied: SceneOp[];
  /** Why an operation was skipped, for honest feedback to the user. */
  skipped: Array<{ op: SceneOp; reason: string }>;
  /** Scenes whose footage must be re-matched — that needs a network call. */
  swapSceneIds: string[];
}

/**
 * Apply operations to a scene list. Pure: no I/O, no clock, no randomness.
 * `swap_clip` cannot be resolved here (it needs a stock search), so it is
 * reported back for the caller to perform.
 */
export function applySceneOps(scenes: ResolvedScene[], operations: SceneOp[]): ApplyResult {
  let next = scenes.map((s) => ({ ...s }));
  const applied: SceneOp[] = [];
  const skipped: Array<{ op: SceneOp; reason: string }> = [];
  const swapSceneIds: string[] = [];

  for (const op of operations) {
    const index = next.findIndex((s) => s.id === op.sceneId);
    if (index === -1) {
      skipped.push({ op, reason: `No scene "${op.sceneId}"` });
      continue;
    }

    switch (op.op) {
      case 'set_duration':
        next[index] = { ...next[index], duration: op.duration };
        applied.push(op);
        break;

      case 'set_description':
        next[index] = { ...next[index], description: op.description };
        applied.push(op);
        break;

      case 'swap_clip':
        if (!swapSceneIds.includes(op.sceneId)) swapSceneIds.push(op.sceneId);
        applied.push(op);
        break;

      case 'delete_scene':
        // A video with no scenes cannot be assembled.
        if (next.length <= 1) {
          skipped.push({ op, reason: 'A video must keep at least one scene' });
          break;
        }
        next.splice(index, 1);
        applied.push(op);
        break;
    }
  }

  // `index` drives render order, caption timing and user-media assignment, so it
  // must stay dense and sequential after a delete. Ids stay stable so a caller
  // holding a sceneId keeps referring to the same scene.
  next = next.map((scene, i) => ({ ...scene, index: i }));

  return { scenes: next, applied, skipped, swapSceneIds };
}

/** A compact scene digest for the model — never send it clip urls. */
export function describeScenesForModel(scenes: ResolvedScene[]): string {
  return scenes
    .map(
      (s) =>
        `${s.id} (scene ${s.index + 1}): ${s.duration}s — "${s.description}"` +
        `${s.mediaType === 'image' ? ' [still image]' : ''}`,
    )
    .join('\n');
}

export const SCENE_CHAT_SYSTEM_PROMPT = `You edit a video's scene list.

You never rewrite the video yourself. You reply with JSON only:
{"reply": "<one short sentence for the user>", "operations": [ ... ]}

Allowed operations (use the exact scene id):
- {"op":"set_duration","sceneId":"scene-2","duration":3}       // seconds, ${MIN_SCENE_DURATION}-${MAX_SCENE_DURATION}
- {"op":"set_description","sceneId":"scene-1","description":"..."}
- {"op":"swap_clip","sceneId":"scene-3"}                        // find different footage
- {"op":"delete_scene","sceneId":"scene-4"}

Rules:
- "faster"/"shorter" means a SMALLER duration; "slower"/"longer" a larger one.
- Only emit operations the user actually asked for. If nothing should change,
  return an empty operations array and explain why in "reply".
- Never invent scene ids. Never add fields.`;
