/**
 * Background music library.
 *
 * Tracks are NOT bundled with the repo — music needs a license. Drop audio files
 * into `public/music/` and describe them in `public/music/tracks.json`:
 *
 *   [
 *     { "id": "uplift-01", "title": "Uplift", "moods": ["happy", "energetic"], "file": "uplift-01.mp3" },
 *     { "id": "calm-01",   "title": "Still",  "moods": ["calm", "sad"],        "file": "calm-01.mp3" }
 *   ]
 *
 * When the manifest is absent or empty, music is simply skipped — generation
 * still succeeds, it just has no soundtrack.
 *
 * Relative imports only: this runs inside the worker process too.
 */

import fs from 'fs';
import path from 'path';

export interface MusicTrack {
  id: string;
  title: string;
  /** Free-form mood tags, matched case-insensitively. */
  moods: string[];
  /** Filename relative to public/music. */
  file: string;
  license?: string;
}

function musicDir(): string {
  return path.join(process.cwd(), 'public', 'music');
}

export function listMusicTracks(): MusicTrack[] {
  const manifest = path.join(musicDir(), 'tracks.json');
  if (!fs.existsSync(manifest)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t: any) => t && typeof t.id === 'string' && typeof t.file === 'string',
    ) as MusicTrack[];
  } catch (error) {
    console.error('[Music] Failed to read tracks.json:', error);
    return [];
  }
}

/** Absolute path of a track's audio file, or null if it is missing on disk. */
export function trackPath(track: MusicTrack): string | null {
  const p = path.join(musicDir(), track.file);
  return fs.existsSync(p) ? p : null;
}

/**
 * Pick a track for a mood (e.g. the emotion detected from the prompt, or the
 * requested style). Falls back to any available track so a soundtrack still
 * plays when nothing matches. Returns null when the library is empty.
 */
export function selectTrackForMood(mood?: string): MusicTrack | null {
  const tracks = listMusicTracks().filter((t) => trackPath(t));
  if (tracks.length === 0) return null;

  if (mood) {
    const wanted = mood.toLowerCase();
    const match = tracks.find((t) =>
      (t.moods ?? []).some((m) => String(m).toLowerCase() === wanted),
    );
    if (match) return match;
  }
  return tracks[0];
}

/** Resolve a mood straight to a playable absolute path (or null). */
export function selectMusicPath(mood?: string): string | null {
  const track = selectTrackForMood(mood);
  if (!track) {
    console.log('[Music] No tracks configured — generating without a soundtrack');
    return null;
  }
  const p = trackPath(track);
  if (p) console.log(`[Music] Using "${track.title}" for mood "${mood ?? 'any'}"`);
  return p;
}
