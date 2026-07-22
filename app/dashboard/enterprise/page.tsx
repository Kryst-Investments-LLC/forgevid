import { redirect } from 'next/navigation'

// The enterprise console (telemetry, compliance, health) is not built yet. The
// previous page rendered hardcoded/fabricated metrics and crashed on its
// Performance/Health tabs, so it redirects to the dashboard until it is
// implemented for real, rather than shipping a fake feature.
export default function EnterprisePage() {
  redirect('/dashboard')
}
