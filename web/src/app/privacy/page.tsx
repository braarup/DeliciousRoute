export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[#e0e0e0] bg-white px-6 py-8 shadow-sm text-sm leading-relaxed text-[#424242]">
          <h1 className="text-2xl font-semibold text-[var(--dr-text)]">Privacy Policy</h1>
          <p className="mt-2 text-xs text-[#757575]">
            <strong>Effective Date:</strong> [Insert Date]
          </p>
          <p className="mt-4">
            <strong>DeliciousRoute.com</strong> ("DeliciousRoute", "we", "our", or "us") is committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our
            website, mobile application, and related services (the "Platform").
          </p>

          <h2 className="mt-5 text-base font-semibold">1. Information We Collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Personal Information:</strong> Name, email, account info, and similar details you provide during
              registration or use.
            </li>
            <li>
              <strong>Location Data:</strong> If you enable location services, we may collect your device&apos;s location to show
              nearby vendors.
            </li>
            <li>
              <strong>Usage Data:</strong> Pages visited, features used, and technical data such as browser and device type.
            </li>
          </ul>

          <h2 className="mt-5 text-base font-semibold">2. How We Use Your Information</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To provide, operate, and improve the Platform and services.</li>
            <li>To personalize your experience and show relevant content.</li>
            <li>To communicate with you about your account, updates, or promotions.</li>
            <li>To comply with legal obligations and protect our rights.</li>
          </ul>

          <h2 className="mt-5 text-base font-semibold">3. Sharing Your Information</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>We do not sell your personal information.</li>
            <li>We may share information with service providers, vendors, or as required by law.</li>
            <li>Aggregated or anonymized data may be shared for analytics or business purposes.</li>
          </ul>

          <h2 className="mt-5 text-base font-semibold">4. Cookies &amp; Tracking</h2>
          <p className="mt-2">
            We use cookies and similar technologies to enhance your experience, analyze usage, and deliver relevant ads. You can
            control cookies through your browser settings.
          </p>

          <h2 className="mt-5 text-base font-semibold">5. Data Security</h2>
          <p className="mt-2">
            We implement reasonable measures to protect your information, but no system is 100% secure.
          </p>

          <h2 className="mt-5 text-base font-semibold">6. Your Choices</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You may update or delete your account information at any time.</li>
            <li>You may opt out of marketing emails by following the unsubscribe link.</li>
            <li>You can disable location services in your device settings if you prefer not to share location data.</li>
          </ul>

          <h2 className="mt-5 text-base font-semibold">7. Children&apos;s Privacy</h2>
          <p className="mt-2">
            The Platform is not intended for children under 13. We do not knowingly collect data from children under 13.
          </p>

          <h2 className="mt-5 text-base font-semibold">8. Changes to This Policy</h2>
          <p className="mt-2">
            We may update this Privacy Policy from time to time. Changes are effective upon posting. Please review periodically.
          </p>

          <h2 className="mt-5 text-base font-semibold">9. Contact Us</h2>
          <p className="mt-2">
            For questions or concerns about this Privacy Policy, please use the
            form on our <span className="font-semibold">Contact</span> page to reach the Delicious Route team.
          </p>

          <h2 className="mt-5 text-base font-semibold">10. Legal</h2>
          <p className="mt-2">
            You can learn more about our overall terms and how the Platform is
            presented by reviewing these related pages:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <span className="font-semibold">Terms of Service</span> – governs your use of the Platform and your
              relationship with Delicious Route.
            </li>
            <li>
              <span className="font-semibold">Disclaimer</span> – outlines important limitations regarding vendor
              information, food safety, and third-party services.
            </li>
            <li>
              <span className="font-semibold">Security</span> – provides guidance on reporting suspicious activity or
              potential vulnerabilities.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
