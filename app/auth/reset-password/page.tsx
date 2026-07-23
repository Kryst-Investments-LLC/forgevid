"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

const PASSWORD_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter, a number and a special character."

function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get("token") || ""
  const email = params.get("email") || ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linkOk = Boolean(token && email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("The two passwords do not match.")
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setDone(true)
      } else {
        setError(
          Array.isArray(data.details) && data.details.length
            ? data.details[0]
            : data.error || "Could not reset your password.",
        )
      }
    } catch {
      setError("Network error. Please try again.")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-bold">VidForge AI</span>
        </div>

        <Card className="bg-white border-gray-200 text-gray-900">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Choose a new password</CardTitle>
            <CardDescription className="text-gray-600">
              {done ? "All set" : email ? `for ${email}` : "Reset your account password"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {done ? (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <p className="text-sm text-gray-500">
                  Your password has been reset. You can now sign in with it.
                </p>
                <Link href="/auth/login">
                  <Button className="w-full">Go to sign in</Button>
                </Link>
              </div>
            ) : !linkOk ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-red-600">
                  This reset link is incomplete or invalid. Please request a new one.
                </p>
                <Link href="/auth/forgot-password">
                  <Button variant="outline" className="w-full">
                    Request a new link
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                  className="pl-10 pr-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="New password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-gray-700">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500">{PASSWORD_HINT}</p>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Resetting..." : "Reset password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
