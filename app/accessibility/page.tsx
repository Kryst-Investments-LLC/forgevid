import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">← Back to Home</Button>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Accessibility Statement</h1>
          <p className="text-slate-600">We strive to meet WCAG 2.1 AA standards</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Our Commitment</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <ul className="list-disc pl-6 space-y-2">
              <li>Keyboard navigability across primary workflows</li>
              <li>Semantic HTML and ARIA where appropriate</li>
              <li>Color contrast meeting WCAG AA</li>
              <li>Ongoing audits using Lighthouse and manual reviews</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



