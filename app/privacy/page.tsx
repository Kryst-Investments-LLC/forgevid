import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { LEGAL } from "@/lib/legal"

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              ← Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Introduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              ForgeVid ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, disclose, and safeguard your information when you use our AI-powered video creation
              platform.
            </p>
            <p>
              We comply with the General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), and
              other applicable privacy laws.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">Personal Information</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name and email address (for account creation)</li>
              <li>Payment information (processed securely through Stripe)</li>
              <li>Profile information you choose to provide</li>
              <li>Communication preferences</li>
            </ul>

            <h4 className="font-semibold">Usage Information</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Videos and content you create or upload</li>
              <li>Platform usage patterns and feature interactions</li>
              <li>Device information and IP addresses</li>
              <li>Performance and error logs</li>
            </ul>

            <h4 className="font-semibold">Automatically Collected Information</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cookies and similar tracking technologies</li>
              <li>Analytics data about platform usage</li>
              <li>Technical information about your device and browser</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">Service Provision</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain the ForgeVid platform</li>
              <li>Process your video creation and editing requests</li>
              <li>Manage your account and subscription</li>
              <li>Provide customer support</li>
            </ul>

            <h4 className="font-semibold">Improvement and Analytics</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Analyze usage patterns to improve our service</li>
              <li>Develop new features and capabilities</li>
              <li>Monitor platform performance and security</li>
            </ul>

            <h4 className="font-semibold">Communication</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Send service-related notifications</li>
              <li>Provide updates about new features</li>
              <li>Send marketing communications (with your consent)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Information Sharing and Disclosure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">We Do Not Sell Your Personal Information</h4>
            <p>We do not sell, trade, or rent your personal information to third parties.</p>

            <h4 className="font-semibold">Service Providers</h4>
            <p>We may share information with trusted service providers who assist us in operating our platform:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Payment processing (Stripe)</li>
              <li>Cloud hosting and storage</li>
              <li>Analytics and monitoring services</li>
              <li>Customer support tools</li>
            </ul>

            <h4 className="font-semibold">Legal Requirements</h4>
            <p>We may disclose information when required by law or to protect our rights and safety.</p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Data Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">Security Measures</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and authentication</li>
              <li>Secure payment processing</li>
            </ul>

            <h4 className="font-semibold">Data Retention</h4>
            <p>
              We retain your information only as long as necessary to provide our services and comply with legal
              obligations.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Rights and Choices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">GDPR Rights (EU Residents)</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to access your personal data</li>
              <li>Right to rectify inaccurate information</li>
              <li>Right to erase your data ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
            </ul>

            <h4 className="font-semibold">CCPA Rights (California Residents)</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to know what personal information is collected</li>
              <li>Right to delete personal information</li>
              <li>Right to opt-out of sale (we don't sell data)</li>
              <li>Right to non-discrimination</li>
            </ul>

            <h4 className="font-semibold">Exercising Your Rights</h4>
            <p>
              To exercise these rights, contact us at {LEGAL.privacyEmail} or use the data export/deletion tools in your
              account settings.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cookies and Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">Types of Cookies</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Essential cookies for platform functionality</li>
              <li>Analytics cookies to understand usage patterns</li>
              <li>Preference cookies to remember your settings</li>
            </ul>

            <h4 className="font-semibold">Cookie Management</h4>
            <p>
              You can control cookies through your browser settings. Note that disabling certain cookies may affect
              platform functionality.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Your information may be transferred to and processed in countries other than your own. We ensure
              appropriate safeguards are in place for international transfers.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Our service is not intended for children under 13. We do not knowingly collect personal information from
              children under 13.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting
              the new policy on this page and updating the "Last updated" date.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p>If you have questions about this Privacy Policy or our data practices, please contact us:</p>
            <div className="mt-4 space-y-2">
              <p>
                <strong>Email:</strong> {LEGAL.privacyEmail}
              </p>
              <p>
                <strong>Data Protection Officer:</strong> {LEGAL.dpoEmail}
              </p>
              <p>
                <strong>Address:</strong> {LEGAL.address}
                <br />
                <strong>Platform Ownership:</strong> ForgeVid is owned and operated by {LEGAL.companyName}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
