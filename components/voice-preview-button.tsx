"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Play, Square } from "lucide-react"

/**
 * Play a short sample of the selected narration voice.
 *
 * Fetches /api/voices/preview (server-cached per voice) and plays it. Fetch —
 * not a bare <audio src> — so a 503 (no ElevenLabs key) or 400 surfaces as a
 * readable message instead of a silent media error.
 */
export function VoicePreviewButton({ voiceId }: { voiceId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle")
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  const stop = () => {
    audioRef.current?.pause()
    audioRef.current = null
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setState("idle")
  }

  // Stop playback when the picked voice changes or the picker unmounts.
  useEffect(() => stop, [voiceId])

  const play = async () => {
    if (state === "playing") return stop()
    setState("loading")
    setError(null)
    try {
      const res = await fetch(`/api/voices/preview?id=${encodeURIComponent(voiceId)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Preview unavailable")
        setState("idle")
        return
      }
      const url = URL.createObjectURL(await res.blob())
      urlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = stop
      audio.onerror = stop
      await audio.play()
      setState("playing")
    } catch {
      setError("Could not play the preview")
      setState("idle")
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={play}
        disabled={state === "loading"}
        title={state === "playing" ? "Stop" : "Hear this voice"}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-600 bg-gray-800/50 px-2.5 text-xs text-gray-200 hover:bg-gray-700/60 disabled:opacity-60"
      >
        {state === "loading" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : state === "playing" ? (
          <Square className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        {state === "playing" ? "Stop" : "Preview"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  )
}
