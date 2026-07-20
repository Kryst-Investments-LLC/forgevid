import { LegalDoc } from '@/components/legal-doc';
import { REFUND } from '@/lib/legal';
import LocaleNotice from '@/components/LocaleNotice';

export const metadata = { title: 'Refund & Cancellation Policy — ForgeVid' };

// Locale twin for /refund (terms + privacy already had one; this one was missing,
// so /en/refund 404'd under localePrefix:'always'). Server component, same shape.
export default function LocalizedRefund() {
  return (
    <div className="min-h-screen">
      <LocaleNotice pageType="refund" />
      <LegalDoc doc={REFUND} />
    </div>
  );
}
