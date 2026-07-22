import { redirect } from 'next/navigation'

// The collaboration feature (real-time multi-user editing) is not built yet.
// The previous page was entirely mock data (fake teammates, scripted chat,
// Math.random() "live" cursors), so it redirects to the dashboard until it is
// implemented for real, rather than shipping a fake feature.
export default function CollaboratePage() {
  redirect('/dashboard')
}
