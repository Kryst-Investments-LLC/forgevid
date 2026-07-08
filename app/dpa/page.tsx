import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LEGAL } from "@/lib/legal"

export default function DpaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">← Back to Home</Button>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Data Processing Addendum (DPA)</h1>
          <p className="text-slate-600">This DPA forms part of the Terms of Service</p>
        </div>

        <Card className="mb-8">
          <CardHeader><CardTitle>Scope</CardTitle></CardHeader>
          <CardContent>
            <p>
              This DPA governs {LEGAL.companyName}'s processing of personal data on behalf of customers in connection with the services.
              It incorporates the Standard Contractual Clauses where applicable.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader><CardTitle>Subprocessors</CardTitle></CardHeader>
          <CardContent>
            <p>
              A current list of subprocessors is available at <Link href="/subprocessors" className="text-cyan-600 underline">/subprocessors</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



