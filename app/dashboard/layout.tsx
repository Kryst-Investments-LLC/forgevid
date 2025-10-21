import type React from "react"
import { SubscriptionProvider } from "@/hooks/use-subscription-simple"
import { DashboardSidebar } from "@/components/dashboard-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SubscriptionProvider>
      <div className="flex min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <DashboardSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SubscriptionProvider>
  )
}
