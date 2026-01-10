import { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy Policy for ${siteConfig.name}. Learn how we collect, use, and protect your personal information.`,
};

export default function PrivacyPolicyPage() {
  const lastUpdated = '2026-01-10';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Privacy Policy
        </h1>
        <p className="text-gray-500 mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-pink max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Welcome to {siteConfig.name} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting
              your privacy and ensuring transparency about how we collect, use, and share information
              about you when you visit our website at {siteConfig.url} (the &quot;Site&quot;).
            </p>
            <p className="text-gray-600">
              This Privacy Policy explains our practices regarding the collection and use of your
              information. By using our Site, you agree to the collection and use of information
              in accordance with this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Automatically Collected Information</h3>
            <p className="text-gray-600 mb-4">
              When you visit our Site, we automatically collect certain information about your device, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Referring URLs</li>
              <li>Pages viewed and time spent on pages</li>
              <li>Date and time of visits</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Cookies and Tracking Technologies</h3>
            <p className="text-gray-600">
              We use cookies and similar tracking technologies to collect and track information
              about your browsing activities. Cookies are small data files stored on your device.
              You can instruct your browser to refuse all cookies or to indicate when a cookie
              is being sent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Third-Party Advertising</h2>
            <p className="text-gray-600 mb-4">
              We use Google AdSense to display advertisements on our Site. Google AdSense uses
              cookies to serve ads based on your prior visits to our Site and other websites.
              Google&apos;s use of advertising cookies enables it and its partners to serve ads
              based on your visit to our Site and/or other sites on the Internet.
            </p>
            <p className="text-gray-600 mb-4">
              You may opt out of personalized advertising by visiting{' '}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 hover:text-pink-600"
              >
                Google Ads Settings
              </a>.
            </p>
            <p className="text-gray-600">
              For more information about how Google uses data when you use our Site, please visit{' '}
              <a
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 hover:text-pink-600"
              >
                How Google uses data
              </a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Google Analytics</h2>
            <p className="text-gray-600">
              We use Google Analytics to analyze the use of our Site. Google Analytics collects
              information such as how often users visit the Site, what pages they visit, and what
              other sites they used prior to coming to our Site. We use this information to improve
              our Site and content. Google Analytics collects the IP address assigned to you on the
              date you visit the Site, but not your name or other identifying information. You can
              opt out of Google Analytics by installing the{' '}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 hover:text-pink-600"
              >
                Google Analytics Opt-out Browser Add-on
              </a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Provide, maintain, and improve our Site</li>
              <li>Analyze usage patterns and trends</li>
              <li>Display relevant advertisements</li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-600">
              We retain the information we collect for as long as necessary to fulfill the purposes
              outlined in this Privacy Policy, unless a longer retention period is required or
              permitted by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
            <p className="text-gray-600 mb-4">
              Depending on your location, you may have certain rights regarding your personal
              information, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>The right to access your personal information</li>
              <li>The right to correct inaccurate information</li>
              <li>The right to request deletion of your information</li>
              <li>The right to opt out of certain data processing activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Children&apos;s Privacy</h2>
            <p className="text-gray-600">
              Our Site is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If you are a parent or guardian
              and believe your child has provided us with personal information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
            <p className="text-gray-600">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
            <p className="text-gray-600">
              If you have any questions about this Privacy Policy, please contact us at:{' '}
              <a
                href="mailto:privacy@kpop.andxo.com"
                className="text-pink-500 hover:text-pink-600"
              >
                privacy@kpop.andxo.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <Link
            href="/"
            className="text-pink-500 hover:text-pink-600 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
