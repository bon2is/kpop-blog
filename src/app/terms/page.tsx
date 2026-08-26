import { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of Service for ${siteConfig.name}. Please read these terms carefully before using our website.`,
  alternates: { canonical: `${siteConfig.url}/terms` },
};

export default function TermsOfServicePage() {
  const lastUpdated = '2026-01-10';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Terms of Service
        </h1>
        <p className="text-gray-500 mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-pink max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600">
              By accessing and using {siteConfig.name} (&quot;the Site&quot;), you accept and agree to be
              bound by these Terms of Service. If you do not agree to these terms, please do not
              use our Site.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              {siteConfig.name} is a K-Pop and K-Drama news aggregation service that provides:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>AI-curated summaries of entertainment news</li>
              <li>Original commentary and analysis</li>
              <li>Links to original source articles</li>
              <li>AI-generated artwork for article thumbnails</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Content and Copyright</h2>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Our Content</h3>
            <p className="text-gray-600 mb-4">
              The summaries, commentary, and AI-generated images on this Site are original content
              created by {siteConfig.name}. All such content is protected by copyright and may not
              be reproduced without permission.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Third-Party Content</h3>
            <p className="text-gray-600">
              We provide summaries of and links to articles from third-party sources. The original
              articles and their content belong to their respective owners. We encourage users to
              visit the original sources for complete coverage.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. AI-Generated Content</h2>
            <p className="text-gray-600">
              This Site uses artificial intelligence to generate article summaries, commentary,
              and thumbnail images. While we strive for accuracy, AI-generated content may contain
              errors or inaccuracies. Users should verify important information with original sources.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. User Conduct</h2>
            <p className="text-gray-600 mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Use the Site for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Site&apos;s operation</li>
              <li>Scrape or collect data from the Site without permission</li>
              <li>Use automated systems to access the Site excessively</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Advertising</h2>
            <p className="text-gray-600">
              The Site displays advertisements provided by third-party advertising networks,
              including Google AdSense. By using the Site, you acknowledge that advertisements
              may be displayed alongside our content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-gray-600">
              THE SITE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SITE WILL BE UNINTERRUPTED,
              ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-600">
              TO THE FULLEST EXTENT PERMITTED BY LAW, {siteConfig.name.toUpperCase()} SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
              ARISING FROM YOUR USE OF THE SITE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. External Links</h2>
            <p className="text-gray-600">
              The Site contains links to third-party websites. We are not responsible for the
              content, privacy policies, or practices of any third-party sites. Accessing these
              links is at your own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
            <p className="text-gray-600">
              We reserve the right to modify these Terms of Service at any time. Changes will be
              effective immediately upon posting to the Site. Your continued use of the Site after
              changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
            <p className="text-gray-600">
              These Terms shall be governed by and construed in accordance with applicable laws,
              without regard to conflict of law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact</h2>
            <p className="text-gray-600">
              For questions about these Terms of Service, please contact us at:{' '}
              <a
                href="mailto:admin@andxo.com"
                className="text-pink-500 hover:text-pink-600"
              >
                admin@andxo.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4">
          <Link
            href="/"
            className="text-pink-500 hover:text-pink-600 font-medium"
          >
            ← Back to Home
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/privacy"
            className="text-pink-500 hover:text-pink-600 font-medium"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
