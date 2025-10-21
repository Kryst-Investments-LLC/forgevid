"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = 'forgevid_cookie_consent_v1';

type Consent = {
  necessary: boolean;
  analytics: boolean;
  ads: boolean;
};

export default function CookiePreferences() {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState<Consent>({ necessary: true, analytics: false, ads: false });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') setConsent({ necessary: true, analytics: !!parsed.analytics, ads: !!parsed.ads });
      }
    } catch {}
  }, []);

  const save = (value: Consent) => {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(value)); } catch {}
    setOpen(false);
    if (typeof window !== 'undefined') window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="px-0 h-auto">Manage Cookies</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Cookie Preferences</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="p-3 rounded-lg bg-muted/50">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked readOnly className="mt-1" />
              <div>
                <div className="font-medium">Necessary</div>
                <div className="text-muted-foreground">Required for the site to function and cannot be disabled.</div>
              </div>
            </label>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={consent.analytics} onChange={(e)=> setConsent(v=>({...v, analytics: e.target.checked}))} className="mt-1" />
              <div>
                <div className="font-medium">Analytics</div>
                <div className="text-muted-foreground">Helps us understand usage to improve the platform.</div>
              </div>
            </label>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={consent.ads} onChange={(e)=> setConsent(v=>({...v, ads: e.target.checked}))} className="mt-1" />
              <div>
                <div className="font-medium">Ads/Marketing</div>
                <div className="text-muted-foreground">Personalized advertising and remarketing.</div>
              </div>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=> save({ necessary: true, analytics: false, ads: false })}>Reject All</Button>
          <Button onClick={()=> save(consent)}>Save Preferences</Button>
          <Button className="bg-primary" onClick={()=> save({ necessary: true, analytics: true, ads: true })}>Accept All</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


