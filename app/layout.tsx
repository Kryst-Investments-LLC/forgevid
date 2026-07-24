
import type { Metadata } from "next"
import { headers } from "next/headers"
import "./globals.css"
import { AuthProvider } from "@/components/providers/session-provider"
import { AnalyticsProvider } from "@/components/providers/analytics-provider"

export const metadata: Metadata = {
  title: "ForgeVid",
  description: "AI Video Platform",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = (await headers()).get("x-forgevid-locale") || "en"

  return (
    <html lang={locale}>
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
