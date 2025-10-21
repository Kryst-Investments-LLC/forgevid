"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Shield, Smartphone, Key } from "lucide-react";
import Link from "next/link";
export default function MFASetupPage() {
    const [step, setStep] = useState(1);
    const [mfaCode, setMfaCode] = useState("");
    const [backupCodes, setBackupCodes] = useState([
        "1a2b-3c4d",
        "5e6f-7g8h",
        "9i0j-1k2l",
        "3m4n-5o6p",
        "7q8r-9s0t",
        "1u2v-3w4x",
        "5y6z-7a8b",
        "9c0d-1e2f",
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const handleEnableMFA = async () => {
        setIsLoading(true);
        // Simulate MFA setup
        setTimeout(() => {
            setIsLoading(false);
            setStep(3);
        }, 2000);
    };
    return (<div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground"/>
          </div>
          <span className="font-heading text-xl font-bold">VidForge AI</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary"/>
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === 1 && "Enable Two-Factor Authentication"}
              {step === 2 && "Verify Your Device"}
              {step === 3 && "MFA Enabled Successfully"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Secure your account with an additional layer of protection"}
              {step === 2 && "Enter the code from your authenticator app"}
              {step === 3 && "Your account is now protected with two-factor authentication"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (<>
                <Alert>
                  <Smartphone className="h-4 w-4"/>
                  <AlertDescription>
                    You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mx-auto mb-4 w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Key className="h-8 w-8 mx-auto mb-2 text-muted-foreground"/>
                        <p className="text-sm text-muted-foreground">QR Code</p>
                        <p className="text-xs text-muted-foreground">Scan with your authenticator app</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Or enter this code manually:</p>
                    <code className="bg-muted px-3 py-1 rounded text-sm">JBSWY3DPEHPK3PXP</code>
                  </div>

                  <Button onClick={() => setStep(2)} className="w-full">
                    I've Added the Account
                  </Button>
                </div>
              </>)}

            {step === 2 && (<>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mfaCode">Verification Code</Label>
                    <Input id="mfaCode" type="text" placeholder="Enter 6-digit code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} maxLength={6} className="text-center text-lg tracking-widest"/>
                  </div>

                  <Button onClick={handleEnableMFA} className="w-full" disabled={mfaCode.length !== 6 || isLoading}>
                    {isLoading ? "Verifying..." : "Verify & Enable MFA"}
                  </Button>

                  <Button variant="outline" onClick={() => setStep(1)} className="w-full">
                    Back to QR Code
                  </Button>
                </div>
              </>)}

            {step === 3 && (<>
                <Alert>
                  <Shield className="h-4 w-4"/>
                  <AlertDescription>Two-factor authentication has been enabled for your account.</AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Backup Codes</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Save these backup codes in a safe place. You can use them to access your account if you lose your
                      device.
                    </p>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
                      {backupCodes.map((code, index) => (<code key={index} className="text-sm">
                          {code}
                        </code>))}
                    </div>
                  </div>

                  <Button asChild className="w-full">
                    <Link href="/dashboard">Continue to Dashboard</Link>
                  </Button>
                </div>
              </>)}

            <div className="text-center text-sm">
              <Link href="/dashboard" className="text-primary hover:underline">
                Skip for now
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);
}
