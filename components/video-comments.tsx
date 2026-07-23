"use client"

import { useState, useEffect } from "react"

interface CommentRow {
  id: string
  authorName: string
  body: string
  timestampSec: number | null
  createdAt: string
  isOwner: boolean
}

function timeAgo(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

/** Async review comments for a shared video — usable by the owner or anyone
 *  with the public link. Public reviewers enter a display name (remembered). */
export default function VideoComments({ videoId }: { videoId: string }) {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerName, setViewerName] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fv-reviewer-name")
      if (saved) setName(saved)
    } catch {
      /* ignore */
    }
    fetch(`/api/videos/${videoId}/comments`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setComments(d.comments || [])
          setViewerName(d.viewerName ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [videoId])

  const submit = async () => {
    const bodyText = text.trim()
    if (!bodyText) return
    if (!viewerName && !name.trim()) {
      setError("Please enter your name first.")
      return
    }
    setPosting(true)
    setError("")
    try {
      if (!viewerName && name.trim()) {
        try { localStorage.setItem("fv-reviewer-name", name.trim()) } catch { /* ignore */ }
      }
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: bodyText, ...(viewerName ? {} : { authorName: name.trim() }) }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(d.error || "Could not post your comment.")
        return
      }
      setComments((prev) => [...prev, d.comment])
      setText("")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="w-full max-w-3xl">
      <h2 className="text-sm font-semibold text-white/80 mb-3">
        Feedback {comments.length > 0 && <span className="text-white/40">({comments.length})</span>}
      </h2>

      <div className="space-y-3 mb-5">
        {loading ? (
          <p className="text-sm text-white/40">Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-white/40">No comments yet — be the first to leave feedback.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">{c.authorName}</span>
                {c.isOwner && <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">Creator</span>}
                <span className="text-[11px] text-white/40">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
        {!viewerName && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-white/30"
          />
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={viewerName ? "Reply to feedback…" : "Leave feedback on this video…"}
          rows={3}
          maxLength={2000}
          className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-white/30 resize-none"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={posting || !text.trim()}
            className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            {posting ? "Posting…" : "Post comment"}
          </button>
        </div>
      </div>
    </div>
  )
}
