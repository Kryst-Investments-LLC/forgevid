/**
 * Narration voices (ElevenLabs).
 *
 * The pipeline previously hardcoded a single voice id in two places and used
 * the deprecated `eleven_monolingual_v1` model. This is the one place voices
 * and the model are defined.
 *
 * Relative imports only — this is reachable from the worker process.
 */

export interface Voice {
  id: string;
  name: string;
  gender: 'female' | 'male';
  accent: string;
  description: string;
}

/**
 * ElevenLabs premade voices. `eleven_multilingual_v2` speaks these in many
 * languages, so this doubles as the multilingual voice set.
 */
export const VOICES: Voice[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', accent: 'American', description: 'Calm, narration' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', accent: 'American', description: 'Soft, friendly' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female', accent: 'American', description: 'Emotional, young' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', accent: 'American', description: 'Strong, confident' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', accent: 'American', description: 'Well-rounded, warm' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male', accent: 'American', description: 'Deep, authoritative' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male', accent: 'American', description: 'Crisp, assertive' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', accent: 'American', description: 'Deep, narration' },
];

/**
 * Antoni — the voice the pipeline has always used. Kept as the default so this
 * change does not silently alter the sound of existing projects.
 */
export const DEFAULT_VOICE_ID = 'ErXwobaYiN019PkySvjV';

/** eleven_monolingual_v1 is deprecated; v2 is multilingual and current. */
export const DEFAULT_TTS_MODEL = 'eleven_multilingual_v2';

export function isKnownVoice(voiceId: string): boolean {
  return VOICES.some((v) => v.id === voiceId);
}

/** Fall back to the default rather than sending an unknown id to the API. */
export function resolveVoiceId(voiceId?: string | null): string {
  return voiceId && isKnownVoice(voiceId) ? voiceId : DEFAULT_VOICE_ID;
}
