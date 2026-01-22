export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[#e0e0e0] bg-white px-6 py-8 shadow-sm text-sm leading-relaxed text-[#424242]">
          <h1 className="text-2xl font-semibold text-[var(--dr-text)]">Terms of Service</h1>
          <p className="mt-2 text-xs text-[#757575]">
            <strong>Effective Date:</strong> [Insert Date] · <strong>Last Updated:</strong> [Insert Date]
          </p>
          <p className="mt-4">
            Welcome to <strong>DeliciousRoute.com</strong> ("DeliciousRoute," "we," "our," or "us"). Delicious Route is a
            digital platform that connects food trucks, mobile vendors, and street food enthusiasts ("customers").
          </p>
          <p className="mt-2">
            By accessing or using Delicious Route&apos;s website, mobile application, or related services (collectively, the
            "Platform"), you agree to these Terms of Service ("Terms"). If you do not agree with these Terms, you may not use the
            Platform.
          </p>

          <h2 className="mt-5 text-base font-semibold">1. Eligibility</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You must be at least 18 years old to use the Platform.</li>
            <li>By using the Platform, you confirm you have the authority and legal capacity to enter into this agreement.</li>
          </ul>

          <h2 className="mt-5 text-base font-semibold">2. Accounts</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Registration:</strong> Both vendors and customers must create an account to access certain features.
            </li>
            <li>
              <strong>Accuracy:</strong> You agree to provide accurate, current, and complete information when registering.
            </li>
            <li>
              <strong>Security:</strong> You are responsible for maintaining the confidentiality of your login credentials.
            </li>
            <li>
              <strong>Termination:</strong> We reserve the right to suspend or terminate accounts that violate these Terms.
            </li>
          </ul>

          <h2 className="mt-5 text-base font-semibold">3. Terms for Vendors</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Licensing &amp; Compliance:</strong> You are responsible for all licenses, permits, and insurance required by
              law to operate your food business, and for complying with all food safety and regulatory requirements.
            </li>
            <li>
              <strong>Business Information:</strong> You agree to provide accurate information (business name, menus, prices,
              operating hours, and location) and lawful promotional content.
            </li>
            <li>
              <strong>Vendor Fees &amp; Payments:</strong> Some services (subscriptions, ad placements) require payment. Fees are
              billed as disclosed during sign-up and are generally non-refundable.
            </li>
            <li>
              <strong>Content Ownership &amp; License:</strong> You retain ownership of your logos, menus, images, and videos, but
              grant Delicious Route a non-exclusive, royalty-free license to display and promote this content on the Platform.
            </li>
            <li>
              <strong>Prohibited Vendor Activities:</strong> Misrepresenting products or services, uploading unlawful or harmful
              content, using the Platform for fraudulent purposes, or circumventing payments owed to Delicious Route.
            </li>
          </ul>

          <h2 className="mt-5 text-base font-semibold">4. Terms for Consumers / Customers</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Use of Platform:</strong> You may use the Platform for personal, lawful purposes only and may not copy or
              misuse vendor content.
            </li>
            <li>
              <strong>Transactions with Vendors:</strong> Delicious Route is not a party to transactions between customers and
              vendors. Purchases, payments, refunds, and disputes are between you and the vendor.
            </li>
            <li>
              <strong>Loyalty &amp; Promotions:</strong> Any loyalty programs or promotions offered through the Platform are
              managed by individual vendors.
            </li>
            <li>
              <strong>Conduct:</strong> Customers may not harass vendors or other users, manipulate ratings or reviews, or use the
              Platform to distribute spam or harmful content.
            </li>
          </ul>

          <h2 className="mt-5 text-base font-semibold">5. Location Services</h2>
          <p className="mt-2">
            The Platform may request access to your device&apos;s location to help display nearby vendors. By enabling location
            services, you consent to Delicious Route using this data to improve service functionality.
          </p>

          <h2 className="mt-5 text-base font-semibold">6. Payments &amp; Subscriptions</h2>
          <p className="mt-2">
            Vendor subscription and ad placement fees are disclosed at checkout and charged to the payment method provided. Fees
            may be billed on a recurring basis unless canceled according to our policies. Delicious Route is not responsible for
            refunds between vendors and customers.
          </p>

          <h2 className="mt-5 text-base font-semibold">7. Intellectual Property</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Delicious Route Content:</strong> The Platform&apos;s design, trademarks, and branding are owned by Delicious
              Route and may not be copied or exploited without permission.
            </li>
            <li>
              <strong>User Content:</strong> Vendors and customers retain ownership of their content but grant Delicious Route the
              right to display it within the Platform.
            </li>
          </ul>

          <h2 className="mt-5 text-base font-semibold">8. Disclaimers</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Delicious Route provides the Platform on an "as is" and "as available" basis.</li>
            <li>We do not guarantee uninterrupted or error-free service.</li>
            <li>
              We are not responsible for food quality, safety, legality, vendor compliance, customer behavior, or external
              factors such as outages.
            </li>
          </ul>

          <h2 className="mt-5 text-base font-semibold">9. Limitation of Liability</h2>
          <p className="mt-2">
            To the fullest extent permitted by law, Delicious Route shall not be liable for indirect, incidental, or
            consequential damages. Our total liability will not exceed the amount you paid to Delicious Route (if any) in the 12
            months preceding a claim.
          </p>

          <h2 className="mt-5 text-base font-semibold">10. Indemnification</h2>
          <p className="mt-2">
            You agree to indemnify and hold harmless Delicious Route, its affiliates, officers, and employees from claims or
            damages arising from your use of the Platform, your violation of these Terms, or your transactions with
            vendors/customers.
          </p>

          <h2 className="mt-5 text-base font-semibold">11. Termination</h2>
          <p className="mt-2">
            We may suspend or terminate your access if you violate these Terms. Upon termination, your right to use the Platform
            immediately ends.
          </p>

          <h2 className="mt-5 text-base font-semibold">12. Governing Law</h2>
          <p className="mt-2">
            These Terms are governed by the laws of the State of [Insert State], without regard to conflict of law principles.
          </p>

          <h2 className="mt-5 text-base font-semibold">13. Updates to Terms</h2>
          <p className="mt-2">
            We may update these Terms at any time. Updates are effective upon posting to the Platform. Continued use of the
            Platform means you accept the revised Terms.
          </p>

          <h2 className="mt-5 text-base font-semibold">14. Contact</h2>
          <p className="mt-2">
            For questions or concerns about these Terms, please visit our
            <span className="font-semibold"> Contact</span> page to reach the Delicious Route team.
          </p>

          <h2 className="mt-5 text-base font-semibold">15. Legal</h2>
          <p className="mt-2">
            For more details about how we handle your information and how the
            Platform is presented, please review our related legal pages:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <span className="font-semibold">Privacy Policy</span> – explains how we collect, use, and protect your data.
            </li>
            <li>
              <span className="font-semibold">Disclaimer</span> – clarifies the informational nature of the Platform and
              limits of our responsibility for vendor offerings.
            </li>
            <li>
              <span className="font-semibold">Security</span> – describes how to report suspicious activity or potential
              vulnerabilities related to your Delicious Route account.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
