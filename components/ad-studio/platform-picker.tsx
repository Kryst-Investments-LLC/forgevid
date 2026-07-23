"use client"

import { AD_PLATFORM_LIST, type AdPlatformKey } from "@/lib/ad-platforms"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Platform chips + the selected platform's hook guidance and aspect. */
export function PlatformPicker({
  value,
  onChange,
}: {
  value: AdPlatformKey
  onChange: (key: AdPlatformKey) => void
}) {
  const selected = AD_PLATFORM_LIST.find((p) => p.key === value) ?? AD_PLATFORM_LIST[0]

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {AD_PLATFORM_LIST.map((p) => {
          const active = p.key === value
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.key)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                active ? "border-primary bg-primary/10" : "border-border hover:bg-accent/60",
              )}
            >
              <div className="font-medium">{p.label}</div>
              <div className="text-xs text-muted-foreground">
                {p.aspect} · {p.durationSec}s
              </div>
            </button>
          )
        })}
      </div>
      {selected && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-normal">
            {selected.aspect}
          </Badge>
          <span>{selected.hookNote}</span>
        </div>
      )}
    </div>
  )
}

export default PlatformPicker
