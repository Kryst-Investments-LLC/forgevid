import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getHackathonEvidence } from '@/lib/hackathon-evidence'

export const dynamic = 'force-dynamic'

export default async function HackathonEvidencePage() {
  const evidence = await getHackathonEvidence()
  const s = evidence.summary
  const activation = s.users ? Math.round((s.activatedUsers / s.users) * 100) : 0
  const retention = s.activatedUsers ? Math.round((s.repeatUsers / s.activatedUsers) * 100) : 0
  const cards = [
    ['Hackathon users', s.users],
    ['Activated users', `${s.activatedUsers} (${activation}%)`],
    ['Repeat users', `${s.repeatUsers} (${retention}%)`],
    ['Videos / completed', `${s.videos} / ${s.completedVideos}`],
    ['Completed exports', s.exports],
    ['Verified revenue', `$${s.revenueUsd.toFixed(2)}`],
    ['Recorded AI cost', `$${s.aiCostUsd.toFixed(2)}`],
    ['Consented testimonials', `${s.publicTestimonials} / ${s.testimonials}`],
  ]
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hackathon evidence</h1>
          <p className="text-muted-foreground">Production records since May 19, 2026. No inferred revenue or fabricated users.</p>
        </div>
        <Button asChild><Link href="/api/admin/hackathon-evidence/csv">Export CSV</Link></Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={String(label)}><CardHeader className="pb-2"><CardDescription>{label}</CardDescription></CardHeader><CardContent className="text-2xl font-bold">{value}</CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Evidence definitions</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Activated: created at least one video. Repeat: created more than one video. Revenue: succeeded Payment rows only. Costs: recorded AI-generation costs only.</p>
          <p>Marketing spend and other expenses must be reconciled separately if they are not recorded in ForgeVid. Related-party revenue must be identified manually before submission.</p>
          <p>Public testimonials include only feedback whose submitter explicitly checked public-use consent.</p>
        </CardContent>
      </Card>
    </div>
  )
}
