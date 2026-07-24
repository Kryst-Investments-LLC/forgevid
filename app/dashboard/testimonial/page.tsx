"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function TestimonialPage() {
  const [testimonial, setTestimonial] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [allowPublicUse, setAllowPublicUse] = useState(false)
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')

  async function submit() {
    setState('saving')
    const response = await fetch('/api/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testimonial, businessName, allowPublicUse }),
    })
    setState(response.ok ? 'done' : 'error')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Share your ForgeVid experience</CardTitle>
          <CardDescription>Honest feedback helps improve the product. Public-use permission is optional and recorded separately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name (optional)" />
          <Textarea value={testimonial} onChange={(e) => setTestimonial(e.target.value)} rows={7} placeholder="What did you create? What became faster or better?" />
          <label className="flex gap-3 text-sm">
            <input type="checkbox" checked={allowPublicUse} onChange={(e) => setAllowPublicUse(e.target.checked)} />
            I give ForgeVid permission to quote this feedback with my business name in public marketing and hackathon materials.
          </label>
          <p className="text-xs text-muted-foreground">If unchecked, the feedback remains private product research and will not be quoted publicly.</p>
          <Button onClick={submit} disabled={state === 'saving' || testimonial.trim().length < 20}>
            {state === 'saving' ? 'Saving…' : 'Submit feedback'}
          </Button>
          {state === 'done' && <p className="text-sm text-green-600">Thank you—your feedback and consent choice were recorded.</p>}
          {state === 'error' && <p className="text-sm text-red-600">Could not save feedback. Please try again.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
