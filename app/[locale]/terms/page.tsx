import { LegalDoc } from '@/components/legal-doc';
import { TERMS } from '@/lib/legal';
import LocaleNotice from '@/components/LocaleNotice';

export const metadata = { title: 'Terms of Service — ForgeVid' };

// Server component: it may render the client <LocaleNotice/> as a child and,
// unlike a "use client" wrapper, it is allowed to export `metadata`. It renders
// the shared <LegalDoc/> directly rather than importing the base page module,
// so no metadata export is ever pulled into the client graph.
export default function LocalizedTerms() {
  return (
    <div className="min-h-screen">
      <LocaleNotice pageType="terms" />
      <LegalDoc doc={TERMS} />
    </div>
  );
}
