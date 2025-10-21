import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SubprocessorsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">← Back to Home</Button>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Subprocessors</h1>
          <p className="text-slate-600">Current subprocessors used to deliver our services</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Current List</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>Stripe – Payments</li>
              <li>Amazon Web Services – Hosting/Storage</li>
              <li>Cloudflare – CDN/Security</li>
              <li>Vercel Analytics – Analytics</li>
              <li>PostHog or GA (if enabled) – Analytics</li>
            </ul>
            <p className="text-xs text-slate-500 mt-4">We will update this page prior to adding or replacing subprocessors.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


