"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Download, Youtube, Facebook, Twitter, Instagram } from "lucide-react"
import { useState } from "react"
import { useSubscription } from "@/hooks/use-subscription"
import { FeatureGate, UsageLimit } from "./feature-gate"

export function ExportPanel() {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const { subscription, hasFeature } = useSubscription()

  const handleExport = (format: string) => {
    setIsExporting(true)
    setExportProgress(0)

    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsExporting(false)
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  const currentExports = 15

  return (
    <UsageLimit feature="exports" currentUsage={currentExports}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export & Share
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Options */}
          <div>
            <h4 className="font-medium mb-3">Export Quality</h4>
            <div className="space-y-2">
              {[
                { name: "4K Ultra HD", resolution: "3840x2160", size: "~500MB", requiresPro: true },
                { name: "Full HD", resolution: "1920x1080", size: "~200MB", requiresPro: false },
                { name: "HD", resolution: "1280x720", size: "~100MB", requiresPro: false },
                { name: "Mobile", resolution: "720x1280", size: "~80MB", requiresPro: false },
              ].map((option) => (
                <div key={option.name}>
                  {option.requiresPro ? (
                    <FeatureGate feature="aiFeatures" plan="pro">
                      <Button
                        variant="outline"
                        className="w-full justify-between h-auto p-3 bg-transparent"
                        onClick={() => handleExport(option.name)}
                        disabled={isExporting}
                      >
                        <div className="text-left">
                          <div className="font-medium flex items-center gap-2">
                            {option.name}
                            <Badge variant="secondary" className="text-xs">
                              Pro
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {option.resolution} • {option.size}
                          </div>
                        </div>
                        <Download className="h-4 w-4" />
                      </Button>
                    </FeatureGate>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-between h-auto p-3 bg-transparent"
                      onClick={() => handleExport(option.name)}
                      disabled={isExporting}
                    >
                      <div className="text-left">
                        <div className="font-medium">{option.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.resolution} • {option.size}
                        </div>
                      </div>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Exporting...</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="w-full" />
            </div>
          )}

          {/* Social Media Sharing */}
          <div>
            <h4 className="font-medium mb-3">Share to Social Media</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start bg-transparent">
                <Youtube className="h-4 w-4 mr-2 text-red-500" />
                YouTube
              </Button>
              <Button variant="outline" size="sm" className="justify-start bg-transparent">
                <Instagram className="h-4 w-4 mr-2 text-pink-500" />
                Instagram
              </Button>
              <Button variant="outline" size="sm" className="justify-start bg-transparent">
                <Facebook className="h-4 w-4 mr-2 text-blue-500" />
                Facebook
              </Button>
              <Button variant="outline" size="sm" className="justify-start bg-transparent">
                <Twitter className="h-4 w-4 mr-2 text-blue-400" />
                Twitter
              </Button>
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <h4 className="font-medium mb-3">Advanced</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                  defaultChecked={!hasFeature("watermark")}
                  disabled={!hasFeature("watermark")}
                />
                <span>Include watermark</span>
                {!hasFeature("watermark") && (
                  <Badge variant="outline" className="text-xs">
                    Free
                  </Badge>
                )}
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="rounded" defaultChecked />
                <span>Optimize for web</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="rounded" />
                <span>Generate subtitles file</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </UsageLimit>
  )
}
