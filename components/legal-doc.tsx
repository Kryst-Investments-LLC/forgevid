import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LEGAL, type LegalBlock, type LegalDocument } from "@/lib/legal"

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return <p className="text-slate-700 leading-relaxed">{block}</p>
  }
  if ("list" in block) {
    return (
      <ul className="list-disc pl-6 space-y-2 text-slate-700">
        {block.list.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    )
  }
  return (
    <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
      {block.note}
    </p>
  )
}

export function LegalDoc({ doc }: { doc: LegalDocument }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mt-4 mb-2">{doc.title}</h1>
          <p className="text-slate-600">
            Last updated: {LEGAL.lastUpdated} · {LEGAL.companyName}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {doc.intro.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>

        <div className="space-y-6">
          {doc.sections.map((s, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-lg">{s.heading}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {s.body.map((b, j) => (
                  <Block key={j} block={b} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex gap-5 text-sm text-slate-500">
          <Link href="/terms" className="hover:text-slate-900">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-slate-900">Privacy Policy</Link>
          <Link href="/refund" className="hover:text-slate-900">Refund Policy</Link>
        </div>
      </div>
    </div>
  )
}
