'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CookiesPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Back to Home Button */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors w-fit">
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-balance">Cookies Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">1. What Are Cookies</h2>
            <p className="text-muted-foreground">
              Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to remember you and your preferences, either for a single visit (through a "session cookie") or for multiple repeat visits (through a "persistent cookie").
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Cookies</h2>
            <p className="text-muted-foreground">
              Powabitz uses cookies for several purposes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li><strong>Essential Cookies:</strong> These cookies are necessary for the website to function and cannot be switched off in our systems</li>
              <li><strong>Performance Cookies:</strong> These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site</li>
              <li><strong>Functional Cookies:</strong> These cookies enable enhanced functionality and personalization</li>
              <li><strong>Targeting Cookies:</strong> These cookies may be set through our site by our advertising partners</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">3. Types of Cookies We Use</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">Session Cookies:</h3>
            <p className="text-muted-foreground">
              We use session cookies to remember your login information and preferences while you are using our Service.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Persistent Cookies:</h3>
            <p className="text-muted-foreground">
              We use persistent cookies to remember your preferences and settings for future visits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">4. Managing Cookies</h2>
            <p className="text-muted-foreground">
              Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set and how to manage and delete them, please visit www.allaboutcookies.org.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">5. Third-Party Cookies</h2>
            <p className="text-muted-foreground">
              Our Service may contain links to third-party websites. Third parties may place cookies on your device when you access their sites. We are not responsible for the cookies placed by third parties and encourage you to check their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">6. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Cookies Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">7. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Cookies Policy, please contact us at support@powabitz.com
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
