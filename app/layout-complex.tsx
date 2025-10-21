import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, DM_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { ErrorBoundary } from "@/components/ErrorBoundary"
// Removed next-i18next appWithTranslation and config for app directory compatibility
import { initializeApplication } from "@/lib/initialization"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
})

export const metadata: Metadata = {
  title: "VidForge AI - AI-Powered Video Creation Platform",
  description:
    "Transform your ideas into professional videos with AI. Create stunning content with our advanced video generation, editing, and collaboration tools.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Initialize application on server start
  if (typeof window === 'undefined') {
    // Temporarily disabled for development - was causing server hang
    // initializeApplication().catch(console.error)
    console.log('🚀 ForgeVid starting in development mode...')
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${spaceGrotesk.variable} ${dmSans.variable} antialiased`}>
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <AuthProvider>
              {children}
              <Analytics />
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
