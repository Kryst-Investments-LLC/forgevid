import { LegalDoc } from "@/components/legal-doc"
import { PRIVACY } from "@/lib/legal"

export const metadata = { title: "Privacy Policy — ForgeVid" }

export default function PrivacyPolicyPage() {
  return <LegalDoc doc={PRIVACY} />
}
