# Background music

Tracks are **not** bundled with this repo — background music needs a license.

To enable the "Background Music" add-on, drop audio files here and describe them
in `tracks.json` (same directory):

```json
[
  { "id": "uplift-01", "title": "Uplift", "moods": ["modern", "energetic", "happy"], "file": "uplift-01.mp3", "license": "Artlist #12345" },
  { "id": "calm-01",   "title": "Still",  "moods": ["cinematic", "professional"],   "file": "calm-01.mp3",   "license": "Artlist #12346" }
]
```

- `moods` are matched case-insensitively against the video's **style**
  (`modern` / `cinematic` / `energetic` / `professional`). If nothing matches,
  the first available track is used.
- A track is skipped if its `file` is missing on disk.
- **If `tracks.json` is absent or empty, generation still succeeds** — it just
  has no soundtrack. Music is never a hard requirement.

Music is looped to cover the whole video and **ducked under the voiceover**
using `sidechaincompress`, so narration stays intelligible. Level before ducking
defaults to `0.25` (see `AssembleOptions.musicVolume`).

Reasonable sources: Artlist, Epidemic Sound, Uppbeat, or CC0 libraries. Keep the
license reference in the manifest so you can prove provenance later.
