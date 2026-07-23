"use client"

import { AlertTriangle, Loader2 } from "lucide-react"
import type { ReactNode } from "react"

export function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> {label}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-muted-foreground">{icon}</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && <p className="text-muted-foreground text-sm max-w-sm mx-auto">{description}</p>}
    </div>
  )
}
