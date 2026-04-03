import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "@vercel/postgres";
import { unstable_noStore as noStore } from "next/cache";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { slugifyVendorName } from "@/lib/slug";

type VendorAdminRow = {
  id: string;
  name: string | null;
  primary_region: string | null;
  cuisine_style: string | null;
  subscription_tier: string | null;
  is_verified: boolean;
  sidewalk_vending_permit: string | null;
  sellers_permit: string | null;
  health_permit: string | null;
  updated_at: string | null;
};

async function setVendorVerifiedFromAdmin(formData: FormData) {
  "use server";

  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    redirect("/login");
  }

  const rolesResult = await sql`
    SELECT 1
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ${currentUser.id} AND r.name = 'super_admin'
    LIMIT 1
  `;

  if (!rolesResult.rowCount) {
    redirect("/");
  }

  const vendorId = (formData.get("vendorId") || "").toString().trim();
  const isVerified = formData.get("is_verified") === "true";

  if (!vendorId) {
    redirect("/admin/vendors");
  }

  await sql`
    UPDATE vendors
    SET is_verified = ${isVerified}, updated_at = now()
    WHERE id = ${vendorId}
  `;

  await sql`
    INSERT INTO vendor_audit_events (id, vendor_id, user_id, event_type, description)
    VALUES (
      ${randomUUID()},
      ${vendorId},
      ${currentUser.id},
      ${isVerified ? "verified_by_admin" : "unverified_by_admin"},
      ${isVerified
        ? "Vendor marked as Verified by DR admin panel."
        : "Vendor unmarked as Verified by DR admin panel."}
    )
  `;

  redirect("/admin/vendors");
}

export default async function AdminVendorsPage() {
  noStore();

  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const rolesResult = await sql`
    SELECT r.name
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ${currentUser.id}
  `;

  const roleNames = rolesResult.rows.map((row) =>
    (row.name as string).toLowerCase(),
  );

  if (!roleNames.includes("super_admin")) {
    redirect("/");
  }

  const result = await sql<VendorAdminRow>`
    SELECT
      v.id,
      v.name,
      v.primary_region,
      v.cuisine_style,
      v.subscription_tier,
      v.is_verified,
      v.sidewalk_vending_permit,
      v.sellers_permit,
      v.health_permit,
      to_char(v.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at
    FROM vendors v
    ORDER BY v.updated_at DESC NULLS LAST, v.created_at DESC
  `;

  const vendors = result.rows;

  const hasPermitValue = (value: string | null) => !!(value || "").trim();

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
              DR Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--dr-text)]">
              Vendor Permit Review
            </h1>
            <p className="mt-1 text-sm text-[#616161]">
              Review permit values and manage verified status from one place.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#757575] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]"
          >
            Back home
          </Link>
        </header>

        <main className="grid gap-3">
          {vendors.length === 0 ? (
            <div className="rounded-3xl border border-[#e0e0e0] bg-white px-5 py-8 text-center text-sm text-[#616161] shadow-sm">
              No vendors found.
            </div>
          ) : (
            vendors.map((vendor) => {
              const slug = `${slugifyVendorName(vendor.name)}-${vendor.id.slice(0, 8)}`;
              const permitCount = [
                vendor.sidewalk_vending_permit,
                vendor.sellers_permit,
                vendor.health_permit,
              ].filter((value) => hasPermitValue(value)).length;

              return (
                <article
                  key={vendor.id}
                  className="rounded-3xl border border-[#e0e0e0] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-[var(--dr-text)]">
                        {vendor.name || "Untitled venue"}
                      </h2>
                      <p className="mt-1 text-xs text-[#616161]">
                        {vendor.primary_region || "No city set"}
                        <span className="mx-1">•</span>
                        {vendor.cuisine_style || "No cuisine set"}
                        <span className="mx-1">•</span>
                        Tier: {vendor.subscription_tier || "starter"}
                      </p>
                      <p className="mt-1 text-[11px] text-[#9e9e9e]">
                        Last updated: {vendor.updated_at || "Unknown"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] " +
                          (vendor.is_verified
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700")
                        }
                      >
                        {vendor.is_verified ? "Verified" : "Unverified"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {permitCount}/3 permits
                      </span>
                      <Link
                        href={`/vendor/${slug}`}
                        className="rounded-full border border-[#e0e0e0] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#616161] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]"
                      >
                        View Public Page
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#757575]">
                        Sidewalk Vending Permit
                      </p>
                      <p className="mt-1 break-all text-xs text-[var(--dr-text)]">
                        {vendor.sidewalk_vending_permit || "Not provided"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#757575]">
                        Seller's Permit
                      </p>
                      <p className="mt-1 break-all text-xs text-[var(--dr-text)]">
                        {vendor.sellers_permit || "Not provided"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#757575]">
                        Health Permit
                      </p>
                      <p className="mt-1 break-all text-xs text-[var(--dr-text)]">
                        {vendor.health_permit || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <form
                      action={setVendorVerifiedFromAdmin}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="vendorId" value={vendor.id} />
                      <input
                        type="hidden"
                        name="is_verified"
                        value={vendor.is_verified ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className={
                          "rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white " +
                          (vendor.is_verified
                            ? "bg-slate-500 hover:bg-slate-600"
                            : "bg-[var(--dr-primary)] hover:bg-[var(--dr-accent)]")
                        }
                      >
                        {vendor.is_verified ? "Remove Verified Badge" : "Mark as Verified"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}
