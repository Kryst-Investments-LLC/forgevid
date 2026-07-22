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





