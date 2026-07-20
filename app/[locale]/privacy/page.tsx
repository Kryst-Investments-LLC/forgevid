import { LegalDoc } from '@/components/legal-doc';
import { PRIVACY } from '@/lib/legal';
import LocaleNotice from '@/components/LocaleNotice';

export const metadata = { title: 'Privacy Policy — ForgeVid' };

// Server component (see terms/page.tsx): renders the client notice + shared doc,
// keeps its own metadata, and never pulls a metadata export into the client graph.
export default function LocalizedPrivacy() {
  return (
    <div className="min-h-screen">
      <LocaleNotice pageType="privacy" />
      <LegalDoc doc={PRIVACY} />
    </div>
  );
}
