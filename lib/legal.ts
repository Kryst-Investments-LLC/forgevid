// Legal configuration + document content. Entity-specific values come from env
// (NEXT_PUBLIC_*) so the same content ships across environments. The full,
// canonical drafts live in /legal/*.md; these render the on-site pages.
//
// NOT legal advice — have counsel review /legal/*.md before relying on these.

export const LEGAL = {
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Kryst Investments LLC',
  dpoEmail: process.env.NEXT_PUBLIC_DPO_EMAIL || 'krystinvestments@gmail.com',
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || 'krystinvestments@gmail.com',
  legalEmail: process.env.NEXT_PUBLIC_LEGAL_EMAIL || 'krystinvestments@gmail.com',
  billingEmail: process.env.NEXT_PUBLIC_BILLING_EMAIL || 'krystinvestments@gmail.com',
  address:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
    'Update this business address in NEXT_PUBLIC_COMPANY_ADDRESS',
  website: process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://forgevid.com',
  governingLawState: process.env.NEXT_PUBLIC_GOVERNING_STATE || 'Florida',
  arbitrationVenue: process.env.NEXT_PUBLIC_ARBITRATION_VENUE || 'Miami-Dade County, Florida',
  dmcaAgentEmail: process.env.NEXT_PUBLIC_DMCA_EMAIL || 'krystinvestments@gmail.com',
  lastUpdated: process.env.NEXT_PUBLIC_LEGAL_UPDATED || 'July 13, 2026',
};

const CO = LEGAL.companyName;

/** A paragraph (string), a bullet list, or a highlighted note/disclaimer. */
export type LegalBlock = string | { list: string[] } | { note: string };
export interface LegalSection {
  heading: string;
  body: LegalBlock[];
}
export interface LegalDocument {
  title: string;
  intro: LegalBlock[];
  sections: LegalSection[];
}

export const TERMS: LegalDocument = {
  title: 'Terms of Service',
  intro: [
    `These Terms of Service ("Terms") are a binding agreement between you and ${CO} ("ForgeVid," "we," "us"), governing your access to and use of the ForgeVid websites, applications, APIs, and services (the "Service"). By creating an account, subscribing, or using the Service, you agree to these Terms.`,
    { note: 'PLEASE READ THE DISPUTE RESOLUTION SECTION CAREFULLY — IT REQUIRES BINDING ARBITRATION AND A CLASS-ACTION WAIVER, AND LIMITS HOW YOU CAN SEEK RELIEF, UNLESS YOU OPT OUT WITHIN 30 DAYS.' },
  ],
  sections: [
    {
      heading: '1. Eligibility & accounts',
      body: [
        'You must be at least 18 and able to form a binding contract. If you use the Service for an organization, you represent that you are authorized to bind it.',
        'You are responsible for your account credentials and all activity under your account, and for providing accurate account and billing information. Notify us immediately of any unauthorized use.',
      ],
    },
    {
      heading: '2. The Service; AI and third-party components',
      body: [
        'ForgeVid generates videos from your prompts, uploaded media, and data feeds using automated and artificial-intelligence systems, including third-party providers (e.g., OpenAI, ElevenLabs, HeyGen-class avatar providers, Pexels stock media, Cloudinary, and Stripe for payments). Your use may be subject to those providers’ terms, and we are not responsible for their acts or omissions.',
        'AI output is probabilistic and may be inaccurate, incomplete, non-unique, or unexpected. The Service is a creative tool, not a source of factual, legal, financial, or professional advice.',
        'We may modify, add, or discontinue features and usage limits (videos per month, length, resolution) by plan at any time.',
      ],
    },
    {
      heading: '3. Subscriptions, billing & automatic renewal',
      body: [
        'Paid plans are billed in advance on a recurring basis. Your subscription automatically renews for successive periods at the then-current price until you cancel. At checkout we clearly disclose the recurring charge, amount, and billing interval, and obtain your express consent before charging you.',
        'You may cancel at any time from your account billing settings — cancellation is as easy as signup and takes effect at the end of the current billing period. We do not provide pro-rated refunds for partial periods except as stated in the Refund Policy or required by law.',
        'We will give advance notice (at least 30 days, or as required by law) of any price increase; it applies at your next renewal, and you may cancel before it takes effect. Fees exclude taxes, which are your responsibility. Payments are processed by Stripe; we do not store full card numbers.',
        'Free trials, if offered, convert to a paid subscription unless you cancel first. Refunds are governed by the Refund Policy, incorporated by reference.',
      ],
    },
    {
      heading: '4. Acceptable Use Policy',
      body: [
        'You agree not to use the Service, and not to create, upload, or distribute content, that:',
        {
          list: [
            'violates any law or regulation, or any third party’s rights;',
            'is false, deceptive, or misleading, including advertising that violates the FTC Act, state consumer-protection or automotive/real-estate advertising laws, or endorsement/AI-disclosure rules;',
            'impersonates any real person or uses any person’s voice, image, name, or likeness without their authorization (including AI voice clones or digital replicas), or creates deceptive deepfakes;',
            'fabricates testimonials, reviews, endorsements, or indicators of influence, or presents AI-generated endorsement content without required disclosure;',
            'infringes copyright, trademark, publicity, or other IP (including using stock, music, photos, or feed content you do not have rights to use);',
            'is defamatory, harassing, hateful, sexually exploitative (especially involving minors), or promotes violence or illegal goods/services;',
            'contains malware, or attempts to breach, overload, scrape, reverse-engineer, or circumvent the Service, its rate limits, or its security (including submitting feed URLs that target internal or private network resources);',
            'is used from, or on behalf of anyone in, a jurisdiction subject to comprehensive US sanctions.',
          ],
        },
        'We may remove content, suspend, or terminate accounts that violate this policy, and may report unlawful activity. You remain solely responsible for your content and its use.',
      ],
    },
    {
      heading: '5. Your content & license to us',
      body: [
        'You retain ownership of the prompts, media, feeds, and other materials you provide ("Customer Content"). You grant ForgeVid and its providers a worldwide, non-exclusive license to host, process, transmit, reproduce, and modify Customer Content solely to operate and provide the Service to you.',
        'You represent and warrant that you own or have all rights, licenses, and consents necessary for your Customer Content and for the videos you generate and publish, and that they do not infringe or violate any law or third-party right.',
      ],
    },
    {
      heading: '6. Generated output',
      body: [
        'As between you and ForgeVid, and subject to third-party provider terms, we assign to you our rights, if any, in the finished videos you generate ("Output"), so you may use them commercially.',
        'Because Output is generated substantially by AI, it may not be eligible for copyright protection, and we do not warrant that you can register or exclusively own it.',
        'You must review and verify all Output before using it. Any factual claims in your videos (e.g., a vehicle’s price, mileage, or warranty; a property’s details) are your representations, not ours. Our "facts-only" and similar safeguards are conveniences, not a warranty of accuracy or legal compliance, and are not legal advice.',
        'You are responsible for any disclosures your use of AI-generated content requires under applicable law or platform rules.',
      ],
    },
    {
      heading: '7. Intellectual property & DMCA',
      body: [
        'The Service, and all software, models, trademarks, and content we provide (excluding Customer Content and Output), are owned by ForgeVid or our licensors. We grant you a limited, revocable, non-transferable license to use the Service per these Terms. Third-party/stock media is licensed to you subject to the applicable provider’s license terms.',
        `We respond to notices of alleged copyright infringement under the DMCA. Send notices to our designated agent at ${LEGAL.dmcaAgentEmail}. We may remove content and terminate repeat infringers.`,
      ],
    },
    {
      heading: '8. Disclaimers',
      body: [
        { note: 'THE SERVICE AND ALL OUTPUT ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED/ERROR-FREE OPERATION. WE DO NOT WARRANT THAT OUTPUT IS ACCURATE, LEGALLY COMPLIANT, ORIGINAL, OR SUITABLE FOR ANY PURPOSE.' },
      ],
    },
    {
      heading: '9. Limitation of liability',
      body: [
        { note: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW: (a) NEITHER PARTY IS LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, OR GOODWILL; AND (b) FORGEVID’S TOTAL LIABILITY WILL NOT EXCEED THE GREATER OF (i) THE AMOUNTS YOU PAID US IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (ii) US $100. These limits apply regardless of the theory of liability and even if a remedy fails of its essential purpose.' },
      ],
    },
    {
      heading: '10. Indemnification',
      body: [
        `You will defend, indemnify, and hold harmless ${CO}, its affiliates, and personnel from any claims, damages, liabilities, and expenses (including reasonable attorneys’ fees) arising out of or related to: (a) your Customer Content or Output; (b) your advertising, marketing, or other use of the Service or Output, including any claim that it is deceptive, infringing, or violates any law (including FTC, advertising, automotive, real-estate, privacy, or publicity/voice laws); (c) your breach of these Terms; or (d) your violation of any law or third-party right.`,
      ],
    },
    {
      heading: '11. Term, suspension & termination',
      body: [
        'These Terms apply while you use the Service. You may stop and cancel at any time. We may suspend or terminate your access immediately for breach, legal/security risk, or non-payment. On termination, your license ends and we may delete your content after a reasonable period. Provisions that by nature should survive will survive.',
      ],
    },
    {
      heading: '12. Dispute resolution — arbitration & class waiver',
      body: [
        `Informal resolution first: before filing, contact ${LEGAL.legalEmail} and give us 30 days to resolve the dispute.`,
        `Binding arbitration: any dispute not resolved informally will be settled by binding arbitration administered by the American Arbitration Association under its applicable Rules, rather than in court, except that either party may bring an individual claim in small-claims court. The arbitration will be seated in ${LEGAL.arbitrationVenue}.`,
        { note: 'CLASS-ACTION WAIVER: Disputes will be brought only in an individual capacity — no class, collective, or representative actions, and no consolidation, unless both parties agree.' },
        `30-day opt-out: you may opt out of arbitration and the class waiver by emailing ${LEGAL.legalEmail} within 30 days of first accepting these Terms, stating your name, account, and intent to opt out. Opting out does not affect the rest of these Terms.`,
      ],
    },
    {
      heading: '13. Governing law; changes; miscellaneous',
      body: [
        `These Terms are governed by the laws of the State of ${LEGAL.governingLawState}, without regard to conflict-of-laws rules. Subject to the arbitration section, the exclusive venue for any permitted court action is the state or federal courts located in ${LEGAL.arbitrationVenue}.`,
        'We may update these Terms; for material changes we will provide reasonable notice, and continued use after the effective date means you accept them. If a provision is unenforceable, the rest remains in effect. These Terms, with the Privacy Policy and Refund Policy, are the entire agreement between us.',
        `Contact: ${CO}, ${LEGAL.address}, ${LEGAL.legalEmail}.`,
      ],
    },
  ],
};

export const PRIVACY: LegalDocument = {
  title: 'Privacy Policy',
  intro: [
    `${CO} ("ForgeVid," "we") provides an AI video-generation service. This Policy explains what personal data we collect, how we use and share it, and your rights. For personal data of EU/UK individuals, ForgeVid is the "controller" for its own account and marketing data and a "processor"/"service provider" for the Customer Content you submit.`,
  ],
  sections: [
    {
      heading: '1. Data we collect',
      body: [
        {
          list: [
            'Account & profile: name, email, password (hashed), organization, role.',
            'Billing: subscription plan and history. Card payments are processed by Stripe; we do not receive or store full card numbers.',
            'Customer Content you submit: prompts, uploaded images/audio, feed URLs and the listing/vehicle/product data they return, and the videos you generate — which may include personal data of third parties you choose to include.',
            'Usage & device data: log data, IP address, browser/device info, features used, timestamps, and cookies.',
            'Communications: support messages and emails.',
          ],
        },
        'We do not intentionally collect sensitive/special-category data; please do not submit it unless necessary and lawful.',
      ],
    },
    {
      heading: '2. How we use data & legal bases',
      body: [
        'To provide, maintain, and secure the Service and generate your videos; process payments; provide support; send service and (where permitted) marketing emails you can opt out of; monitor, debug, and prevent abuse/fraud and enforce our Terms; and comply with law.',
        'GDPR legal bases: performance of contract, our legitimate interests (security, product improvement), consent (where required, e.g., marketing/cookies), and legal obligation.',
      ],
    },
    {
      heading: '3. AI processing & training',
      body: [
        'To generate videos we transmit relevant inputs to third-party AI providers (below). We do not sell your personal data, and we do not use your Customer Content to train our own or third parties’ foundation models except as needed to provide the Service.',
      ],
    },
    {
      heading: '4. How we share data',
      body: [
        'We share personal data only with: service providers/sub-processors (below) under contract; at your direction (e.g., publishing your videos); for legal reasons; and in a business transfer, subject to this Policy. We do not sell or "share" (as defined by the CCPA/CPRA) your personal data for cross-context behavioral advertising.',
      ],
    },
    {
      heading: '5. Sub-processors',
      body: [
        'We use vetted providers to run the Service, each bound by GDPR Article 28 / CCPA service-provider terms:',
        {
          list: [
            'Hosting (Vercel) — app hosting',
            'Render worker host — video rendering',
            'Managed Postgres — database',
            'Managed Redis — job queue',
            'Cloudinary — media storage & delivery',
            'Stripe — payments & subscriptions',
            'OpenAI — script/scene generation',
            'ElevenLabs — AI voice synthesis',
            'HeyGen / avatar provider — AI avatars (if used)',
            'Pexels — stock media',
            'Email provider — transactional email',
            'Sentry / analytics — error & product analytics',
          ],
        },
        'We give notice of material changes to this list.',
      ],
    },
    {
      heading: '6. International transfers & retention',
      body: [
        'We are US-based and may process data in the US and other countries. For transfers of EU/UK/Swiss data we rely on Standard Contractual Clauses (and the UK Addendum) or another lawful mechanism.',
        'We keep personal data while your account is active and as needed to provide the Service, then for a limited period to meet legal, tax, security, and dispute-defense needs, after which we delete or anonymize it. We may retain a minimal audit record of key actions and consents.',
      ],
    },
    {
      heading: '7. Your rights',
      body: [
        'California (CCPA/CPRA): you may request to know/access, delete, and correct your personal data, and to limit use of sensitive data; we honor opt-out of sale/sharing (we do not sell/share); and we will not discriminate for exercising rights.',
        'EEA/UK (GDPR): you have rights of access, rectification, erasure, restriction, portability, objection, to withdraw consent, and to lodge a complaint with your supervisory authority.',
        `To exercise any right, contact ${LEGAL.privacyEmail}; we verify identity and respond within the legally required time. If your data was submitted by a Customer, we will refer your request to that Customer.`,
      ],
    },
    {
      heading: '8. Security, children & voice/biometrics',
      body: [
        'We use administrative, technical, and physical safeguards (encryption in transit, access controls, hashed passwords, request validation). No system is perfectly secure. We will notify affected users and regulators of a personal-data breach as required by law.',
        'The Service is not directed to children under 16, and we do not knowingly collect their data.',
        'If a feature ever creates a voice or avatar from your own biometric inputs, we will obtain the consent required by applicable law (e.g., Illinois BIPA) before doing so. You must not submit other people’s voice/likeness without their authorization.',
      ],
    },
    {
      heading: '9. Cookies, changes & contact',
      body: [
        'We use necessary cookies to run the Service and, with consent where required, analytics cookies. We may update this Policy and will post the new version with a new date and, for material changes, give notice.',
        `Contact: ${CO}, ${LEGAL.address}. Privacy requests: ${LEGAL.privacyEmail}.`,
      ],
    },
  ],
};

export const REFUND: LegalDocument = {
  title: 'Refund & Cancellation Policy',
  intro: [
    `This Policy is part of the Terms of Service and explains billing, cancellation, and refunds for ${CO}.`,
  ],
  sections: [
    {
      heading: '1. Subscriptions & automatic renewal',
      body: [
        'Paid plans are billed in advance, per period (monthly unless stated), and renew automatically at the then-current price until you cancel. We disclose the recurring amount and interval, and obtain your consent, at checkout, and send a receipt for each charge.',
      ],
    },
    {
      heading: '2. Cancellation',
      body: [
        'You may cancel anytime from Billing settings — it’s as simple as signing up. Cancellation stops the next renewal; your plan stays active until the end of the current paid period, then does not renew. We do not pro-rate or refund the unused part of a period on cancellation, except as stated below or required by law.',
      ],
    },
    {
      heading: '3. Refunds',
      body: [
        'Because the Service delivers digital goods that are generated and consumed immediately (compute, AI, and render credits), fees are generally non-refundable. However:',
        {
          list: [
            'First-time subscribers: if you’re unhappy, contact us within 7 days of your first paid charge and we may, at our discretion, refund that first charge if you have used little or none of your plan’s video quota.',
            'Duplicate or accidental charges, or charges after a valid cancellation, will be refunded.',
            'Statutory rights preserved: nothing here limits non-waivable consumer-law rights you may have (e.g., an EU/UK 14-day right of withdrawal — which may not apply once you have started generating videos and consented to immediate performance).',
            'Renewals are generally non-refundable; cancel before a renewal date to avoid the next charge.',
          ],
        },
      ],
    },
    {
      heading: '4. Failed or defective renders',
      body: [
        'If a video fails to render due to a fault on our side, we will re-render it or credit the video back to your quota — this is your exclusive remedy for a failed render, and it is not a cash refund. Renders that fail because of your inputs (unreachable feed URLs, missing/invalid photos, or content that violates the Acceptable Use Policy) are your responsibility.',
      ],
    },
    {
      heading: '5. Trials, price changes & chargebacks',
      body: [
        'Any free trial converts to a paid subscription unless you cancel before it ends. Promotional credits have no cash value and expire as stated. We give advance notice of price increases (at least 30 days, or as required by law).',
        `If you believe a charge is wrong, please contact us first at ${LEGAL.billingEmail} — we usually resolve it faster than a bank dispute. Filing a chargeback without contacting us may result in suspension pending resolution.`,
      ],
    },
    {
      heading: '6. How to request a refund',
      body: [
        `Email ${LEGAL.billingEmail} from your account email with your account, the charge date, and the reason. We aim to respond within 5 business days.`,
      ],
    },
  ],
};
