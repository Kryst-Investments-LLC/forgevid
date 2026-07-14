import { LegalDoc } from "@/components/legal-doc"
import { REFUND } from "@/lib/legal"

export const metadata = { title: "Refund & Cancellation Policy — ForgeVid" }

export default function RefundPolicyPage() {
  return <LegalDoc doc={REFUND} />
}
