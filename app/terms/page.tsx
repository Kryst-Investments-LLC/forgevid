import { LegalDoc } from "@/components/legal-doc"
import { TERMS } from "@/lib/legal"

export const metadata = { title: "Terms of Service — ForgeVid" }

export default function TermsOfServicePage() {
  return <LegalDoc doc={TERMS} />
}
