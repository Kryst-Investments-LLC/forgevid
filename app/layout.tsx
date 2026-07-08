
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/providers/session-provider"
import { AnalyticsProvider } from "@/components/providers/analytics-provider"

export const metadata: Metadata = {
  title: "ForgeVid",
  description: "AI Video Platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <AnalyticsProvider>
            {children}
          </AnalyticsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}