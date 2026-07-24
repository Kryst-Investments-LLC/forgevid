import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function SampleTemplatePage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params
  const template = await prisma.template.findFirst({ where: { id: templateId, isPublic: true } })
  if (!template) notFound()

  let scenes: Array<{ title?: string; prompt?: string }> = []
  try {
    const data = JSON.parse(template.templateData || '{}')
    scenes = Array.isArray(data.scenes) ? data.scenes : []
  } catch {}

  const signup = `/auth/signup?next=${encodeURIComponent(`/dashboard/templates?template=${template.id}`)}`
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <p className="text-cyan-400 font-semibold">ForgeVid template</p>
            <h1 className="text-4xl font-bold mt-2">{template.name}</h1>
            <p className="text-slate-300 mt-4 text-lg">{template.description}</p>
            <div className="flex gap-3 mt-6">
              <Button asChild><Link href={signup}>Create with this template</Link></Button>
              <Button asChild variant="outline"><Link href="/pricing">Try the $99 pilot</Link></Button>
            </div>
          </div>
          <img src={template.thumbnail} alt={template.name} className="w-full rounded-2xl shadow-2xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenes.map((scene, index) => (
            <Card key={index} className="bg-white/5 border-white/10 text-white">
              <CardContent className="pt-6">
                <p className="text-xs text-cyan-400">Scene {index + 1}</p>
                <h2 className="font-semibold mt-1">{scene.title || `Scene ${index + 1}`}</h2>
                <p className="text-sm text-slate-400 mt-2">{scene.prompt}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-slate-500">Nothing is published or sent to prospects without your review and explicit action.</p>
      </div>
    </main>
  )
}
