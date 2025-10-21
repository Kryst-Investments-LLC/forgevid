
import type { Metadata } from "next"
import "./globals.css"

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
        {children}
      </body>
    </html>
  )
}