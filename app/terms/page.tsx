import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { LEGAL } from "@/lib/legal"

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              ← Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-slate-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Agreement to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              By accessing and using ForgeVid ("Service"), you accept and agree to be bound by the terms and
              provision of this agreement.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Service Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              ForgeVid is an AI-powered video creation platform that allows users to generate, edit, and publish
              video content using artificial intelligence technology.
            </p>
            <h4 className="font-semibold">Service Features Include:</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI-powered video generation and editing tools</li>
              <li>Stock media library access</li>
              <li>Template gallery and customization</li>
              <li>Collaboration and sharing features</li>
              <li>Export and publishing capabilities</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>User Accounts and Responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">Account Registration</h4>
            <p>
              You must provide accurate, current, and complete information during registration and keep your account
              information updated.
            </p>

            <h4 className="font-semibold">Account Security</h4>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities
              under your account.
            </p>

            <h4 className="font-semibold">Acceptable Use</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service only for lawful purposes</li>
              <li>Do not create content that infringes on intellectual property rights</li>
              <li>Do not generate harmful, offensive, or inappropriate content</li>
              <li>Do not attempt to reverse engineer or exploit the AI technology</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Subscription and Billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">Subscription Plans</h4>
            <p>
              We offer various subscription tiers with different features and usage limits. Pricing is available on our
              website.
            </p>

            <h4 className="font-semibold">Billing and Payments</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subscriptions are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>We may change pricing with 30 days notice</li>
              <li>Failed payments may result in service suspension</li>
            </ul>

            <h4 className="font-semibold">Cancellation</h4>
            <p>You may cancel your subscription at any time. Service continues until the end of your billing period.</p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">Your Content</h4>
            <p>
              You retain ownership of content you create using our service. You grant us a license to process and store
              your content to provide the service.
            </p>

            <h4 className="font-semibold">Our Technology</h4>
            <p>
              ForgeVid and its underlying technology remain our exclusive property. You may not copy, modify, or
              distribute our software.
            </p>

            <h4 className="font-semibold">Generated Content</h4>
            <p>
              Content generated using our AI tools is owned by you, subject to compliance with these terms and
              applicable laws.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Privacy and Data Protection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and
              protect your information.
            </p>
            <p>We comply with GDPR, CCPA, and other applicable data protection regulations.</p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The service is provided "as is" without warranties of any kind. We are not liable for any indirect,
              incidental, or consequential damages.
            </p>
            <p>
              Our total liability shall not exceed the amount paid by you for the service in the 12 months preceding the
              claim.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We may terminate or suspend your account for violations of these terms. You may terminate your account at
              any time.
            </p>
            <p>Upon termination, your right to use the service ceases immediately.</p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p>For questions about these Terms of Service, please contact us at:</p>
            <p className="mt-2">
              Email: {LEGAL.legalEmail}
              <br />
              Address: {LEGAL.address}
              <br />
              <strong>Platform Ownership:</strong> ForgeVid is owned and operated by {LEGAL.companyName}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
