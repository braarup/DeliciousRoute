export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[#e0e0e0] bg-white px-6 py-8 shadow-sm text-sm leading-relaxed text-[#424242]">
          <h1 className="text-2xl font-semibold text-[var(--dr-text)]">Disclaimer</h1>
          <p className="mt-2 text-xs text-[#757575]">
            <strong>Effective Date:</strong> January 1, 2026
          </p>

          <p className="mt-4">
            The information provided on the Delicious Route website, mobile application, and related
            services (the "Platform") is for general informational and promotional purposes only.
            While we work hard to keep vendor details and locations accurate and up to date, we make
            no guarantees regarding completeness, reliability, or availability.
          </p>

          <h2 className="mt-5 text-base font-semibold">Food, Safety, and Allergens</h2>
          <p className="mt-2">
            Delicious Route does not prepare, handle, or serve food. All food and beverages are
            provided directly by independent vendors. We do not verify ingredient lists, allergen
            information, or food safety practices. If you have dietary restrictions or allergies,
            please confirm all details directly with the vendor before ordering or consuming any
            products.
          </p>

          <h2 className="mt-5 text-base font-semibold">Vendor Information and Availability</h2>
          <p className="mt-2">
            Menus, prices, hours of operation, and GPS locations are submitted or controlled by
            vendors and may change without notice. A vendor&apos;s appearance on the Platform does not
            constitute an endorsement or guarantee of quality, licensing, or compliance with local
            regulations.
          </p>

          <h2 className="mt-5 text-base font-semibold">No Professional Advice</h2>
          <p className="mt-2">
            Content on the Platform, including recommendations, reviews, and promotional material,
            is not intended as legal, financial, medical, or nutritional advice. You should consult
            the appropriate professional for advice specific to your situation.
          </p>

          <h2 className="mt-5 text-base font-semibold">Third-Party Links and Services</h2>
          <p className="mt-2">
            The Platform may contain links to third-party websites, delivery services, social media
            profiles, or mapping tools. These are provided for convenience only. Delicious Route has
            no control over, and assumes no responsibility for, the content, policies, or practices
            of any third-party sites or services.
          </p>

          <h2 className="mt-5 text-base font-semibold">Limitation of Liability</h2>
          <p className="mt-2">
            To the fullest extent permitted by law, Delicious Route and its affiliates are not
            liable for any loss, injury, illness, damages, or expenses arising from your use of the
            Platform or from interactions and transactions between you and any vendor or third
            party.
          </p>

          <h2 className="mt-5 text-base font-semibold">Contact</h2>
          <p className="mt-2">
            If you have questions about this Disclaimer, please visit our Contact page at
            <span className="block"> www.deliciousroute.com/contact</span>
            or use the contact form available there.
          </p>
        </section>
      </div>
    </div>
  );
}
