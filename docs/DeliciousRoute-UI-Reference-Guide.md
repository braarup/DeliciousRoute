# Delicious Route WebApp - UI Reference Guide

## Document Purpose

This guide is a frontend-focused reference for developers who need to resume work on the Delicious Route web application.

Scope of this document:

- User-facing pages and flows
- Menus, sections, forms, CTAs, and state messages
- Shared UI components and where they appear
- Role-based UI behavior (guest/customer/vendor/admin)

Out of scope:

- Backend implementation details and database internals

## UI Navigation Wire Diagram

```mermaid
flowchart TD
    A[Global Header\nSiteHeader] --> B[Home /]
    A --> C[Login /login]
    A --> D[Profile CTA\n/customer/profile or /vendor/profile]
    A --> E[Mobile Hamburger Menu]

    B --> F[Vendors Directory /vendors]
    F --> G[Vendor Public Detail /vendors/[id]]
    G --> H[Vendor Public Profile /vendor/[id]]

    C --> I[MFA Verify /login/verify]
    C --> J[Forgot Password /reset-password]
    J --> K[Reset With Token /reset-password/[token]]

    C --> L[Signup /signup]
    L --> M[Email Verification /verify-email]
    M --> N[Verify Challenge /verify-email/[challengeId]/[token]]

    D --> O[Customer Profile /customer/profile]
    D --> P[Vendor Profile /vendor/profile]

    A --> Q[About]
    A --> R[Contact]
    A --> S[Security]
    A --> T[Terms]
    A --> U[Privacy]
    A --> V[Disclaimer]

    W[Admin Users] --> X[Admin Vendors /admin/vendors]
```

## Global UI Shell

### Header

- File: web/src/components/SiteHeader.tsx
- Mounted in: web/src/app/layout.tsx
- Behavior:
  - Fixed top header with logo, product label, and mobile hamburger menu.
  - Desktop shows role-aware CTA:
    - Guest: Sign in
    - Authenticated user: View your profile
  - Mobile slide-over menu includes:
    - Profile/Sign in CTA
    - Sign out action (if authenticated)
- Sign out implementation note:
  - The sign out button uses `fetch("/api/auth/signout", { method: "POST" })` followed
    by `window.location.href = "/"` — **not** a `<form>` POST.
  - Reason: a form inside a slide-over menu can be unmounted (by closing the menu) before
    the POST fires. The fetch approach fires the request before any navigation occurs.
  - Route handler: `POST /api/auth/signout` calls `destroySession()` and also explicitly
    calls `response.cookies.delete("dr_session")` on the redirect response object.

### Footer

- Appears on profile-focused pages and legal/info pages.
- Includes links to Terms, Privacy, Disclaimer, Contact.

### Visual System

- Global style variables from web/src/app/globals.css:
  - --dr-primary, --dr-accent, --dr-neutral, --dr-text
- UI style language:
  - Rounded cards/pills, subtle shadows, uppercase micro-labels.
  - Responsive layouts for mobile-first behavior.

## Page-by-Page UI Breakdown

## Home Page (/)

- File: web/src/app/page.tsx
- Audience: all users
- Purpose: central discovery hub

### Visible sections

1. Featured/hero promotional area
2. Tabbed content regions (Grub Reels, Vendors, Events)
3. Vendor discovery cards with key info
4. CTA links to vendor/customer auth and browsing

### Vendor card UI elements (home and directory style)

- Vendor image/logo
- Vendor name
- Cuisine and region/city
- Favorite interaction
- Open/closed signal
- Promo snippet when active

### User actions

- Open vendor pages
- Favorite vendors (when logged in)
- Navigate into auth/profile flows

## Vendors Directory (/vendors)

- File: web/src/app/vendors/page.tsx
- Audience: all users
- Purpose: browse all vendor listings

### Visible sections

- Search/filter-style listing area
- Grid/list of vendor cards
- Promo and hours highlights

### User actions

- Open vendor detail pages
- Favorite vendors (logged-in users)

## Vendor Detail Public Page (/vendors/[id])

- File: web/src/app/vendors/[id]/page.tsx
- Audience: all users
- Purpose: read-only detailed vendor discovery page

### Visible sections

- Vendor hero/details
- Cuisine, description, links
- Hours/location summary
- Menu preview integration
- Placeholder/coming-soon areas where applicable

### User actions

- Navigate to maps/location links
- Continue to full vendor route pages

## Vendor Public Profile + Promo Claim (/vendor/[id])

- File: web/src/app/vendor/[id]/page.tsx
- Audience: all users (with claim behavior gated by auth/role)
- Purpose: customer-facing vendor profile + promo claim workflow

### Visible sections

- Vendor identity and media
- Live/active promo card
- Claim status/claim code display
- QR code display for claimed promo

### User actions

- Claim promo (customer accounts only)
- See claim messages:
  - success
  - already claimed
  - already used
  - sold out/inactive

### Mobile notes

- Claim CTAs and status messaging are responsive.
- Promo claim visibility and state handling remain in-page.

## Login (/login)

- File: web/src/app/login/page.tsx
- Audience: guests
- Purpose: credential sign-in

### Visible sections

- Email/password form
- Error notice area
- Forgot password link
- Signup links

### User actions

- Submit credentials
- Enter MFA flow on success

## Login Verification (/login/verify)

- File: web/src/app/login/verify/page.tsx
- Audience: users in MFA challenge flow
- Purpose: complete sign-in via one-time code

### Visible sections

- 6-digit code form
- Status/error messages

### User actions

- Submit one-time code
- Retry sign-in flow if challenge expired/invalid

## Signup (/signup)

- File: web/src/app/signup/page.tsx
- Audience: guests
- Purpose: create account with role/tier options

### Visible sections

- Account fields (name, email, password)
- Role selector (customer vs vendor)
- Vendor tier options when vendor selected
- Password policy dialog access

### User actions

- Create account
- Move into verification flow

## Signup role shortcuts

- /signup/customer -> shortcut route
- /signup/vendor -> shortcut route
- Files:
  - web/src/app/signup/customer/page.tsx
  - web/src/app/vendor/signup/page.tsx

## Email Verification

### Verification entry page (/verify-email)

- File: web/src/app/verify-email/page.tsx
- Purpose: resend and monitor verification status

### Verification completion route

- Files:
  - web/src/app/verify-email/[challengeId]/page.tsx
  - web/src/app/verify-email/[challengeId]/[token]/page.tsx
- Purpose: validate token/challenge and confirm account verification

### Visible states

- Sent confirmation
- Invalid link
- Expired link
- Already verified

## Password Reset

### Reset request (/reset-password)

- File: web/src/app/reset-password/page.tsx
- Purpose: request password reset link via email

### Reset token form (/reset-password/[token])

- File: web/src/app/reset-password/[token]/page.tsx
- Purpose: set new password with policy checks

### Visible states

- Request sent
- Invalid/expired token
- Weak password
- Success confirmation

## Customer Profile (/customer/profile)

- File: web/src/app/customer/profile/page.tsx
- Audience: authenticated customers
- Purpose: customer account + preference + promo/favorites management

### Visible sections

1. Profile/preferences form
2. Account security/password update section
3. Claimed promos list
4. Favorite trucks summary/list modal

### Forms and actions

- Update profile preferences
- Change password
- View favorites modal
- Review claimed (non-redeemed) promos

### Message states

- Inline status messages for password outcomes
- Empty states for favorites/promos

## Vendor Profile (/vendor/profile)

- File: web/src/app/vendor/profile/page.tsx
- Audience: authenticated vendors
- Purpose: full vendor dashboard for public profile and commerce-facing UI

### Major UI sections

1. Basic vendor identity/details
2. Links & socials
3. Truck photos / media
4. Menu management
5. Hours of operation
6. Grub Reel
7. GPS & map settings
8. Promotions & deals
9. Account security / password

### Mobile section navigation

On mobile and tablet (below the `lg` breakpoint), the page renders a **section nav list**
instead of the full scrollable layout.

- Each section appears as a tappable row with a label and description.
- Tapping a row navigates to `?section=<id>` (e.g. `?section=menu`).
- The selected section card is shown with a **"‹ Back to profile"** link at the top that
  clears the `section` param and returns to the nav list.
- Valid `section` IDs: `basic`, `links`, `photos`, `menu`, `hours`, `reel`, `gps`,
  `promos`, `security`.
- Desktop layout (`lg:` and above) is unaffected — all sections are always visible in the
  two-column grid layout.

### Promo redemption UX

- Scanner component supports camera scan + manual code input
- Blocking status modal for redemption result confirmation
- Already redeemed/invalid/missing code states

### Tier UX

- Downgrade confirmation warns about feature/content loss

## Vendor Login (/vendor/login)

- File: web/src/app/vendor/login/page.tsx
- Purpose: vendor-focused sign-in presentation

## Admin Vendors (/admin/vendors)

- File: web/src/app/admin/vendors/page.tsx
- Audience: super admin
- Purpose: vendor governance list with verification controls

### Visible sections

- Vendor table/list
- Verification controls
- Subscription/region/cuisine snapshots

## Informational and Legal Pages

- About: web/src/app/about/page.tsx
- Contact: web/src/app/contact/page.tsx
- Security report: web/src/app/security/page.tsx
- Terms: web/src/app/terms/page.tsx
- Privacy: web/src/app/privacy/page.tsx
- Disclaimer: web/src/app/disclaimer/page.tsx

### Contact page UI

- Name/email/message form with submit CTA

### Security page UI

- Incident report form with category/description metadata

## Shared UI Components Reference

### SiteHeader

- File: web/src/components/SiteHeader.tsx
- Global fixed header + mobile slide-over menu + auth-aware CTA/signout.

### FavoriteButton

- File: web/src/components/FavoriteButton.tsx
- Favorite toggle/count interaction on vendor cards.

### FavoriteTrucksSection

- File: web/src/components/FavoriteTrucksSection.tsx
- Customer profile section with modal list of saved vendors.

### LoginErrorNotice

- File: web/src/components/LoginErrorNotice.tsx
- Maps login error codes to user-readable alert copy.

### PasswordPolicyDialog

- File: web/src/components/PasswordPolicyDialog.tsx
- Reusable password requirement modal in signup/profile flows.

### PromoCodeScanner

- File: web/src/components/PromoCodeScanner.tsx
- QR scan utility (Android/iOS compatible browser scanner path).

### BlockingStatusModal

- File: web/src/components/BlockingStatusModal.tsx
- Blocking modal that requires explicit close; used for important status visibility.

### UpdateGpsButton

- File: web/src/components/UpdateGpsButton.tsx
- Geolocation helper button for vendor profile.

### VendorManageMenuSection

- File: web/src/components/VendorManageMenuSection.tsx
- Vendor menu management interaction section.

### VendorMenuSection

- File: web/src/components/VendorMenuSection.tsx
- Public-facing menu display in vendor detail contexts.

### TierDowngradeButton

- File: web/src/components/TierDowngradeButton.tsx
- Vendor tier downgrade trigger with confirmation UX.

### SignupRoleFields

- File: web/src/components/SignupRoleFields.tsx
- Signup role and tier selection UI cluster.

## Role-Based UI Access Matrix

| UI Area                  | Guest | Customer                | Vendor                  | Admin                   |
| ------------------------ | ----- | ----------------------- | ----------------------- | ----------------------- |
| Home + Vendor Browse     | Yes   | Yes                     | Yes                     | Yes                     |
| Login/Signup flows       | Yes   | Limited (if logged out) | Limited (if logged out) | Limited (if logged out) |
| Customer profile UI      | No    | Yes                     | No                      | No                      |
| Vendor profile UI        | No    | No                      | Yes                     | No                      |
| Admin vendors UI         | No    | No                      | No                      | Yes                     |
| Legal/info pages         | Yes   | Yes                     | Yes                     | Yes                     |
| Mobile signout menu item | No    | Yes                     | Yes                     | Yes                     |

## Critical UI Flows for Future Developers

1. Authentication + MFA

- Paths: /login -> /login/verify -> role landing
- Watch for mobile email/code handoff UX consistency

2. Email verification

- Paths: /signup -> /verify-email -> /verify-email/[challengeId]/[token]
- Ensure error/success states remain explicit

3. Password reset

- Paths: /reset-password -> /reset-password/[token]
- Preserve policy messaging and success affordances

4. Promo claim/redeem

- Customer claims in /vendor/[id]
- Vendor redeems in /vendor/profile
- Scanner + modal status messaging must stay robust on mobile

5. Vendor profile publish quality

- Large, dense form with many sections
- Keep section headings and helper text clear to avoid usability regressions

## UI Maintenance Notes

- Keep image filename casing consistent across public assets and references.
- Preserve responsive behavior in SiteHeader and slide-over menu when adding nav items.
- For major UI additions, update this document in the same PR/commit.

---

## Update Checklist for This Guide

When new UI features are added, update:

1. Wire diagram
2. Page-by-page section
3. Shared component catalog
4. Role matrix
5. Critical flow notes
