# Delicious Route UI Quickstart Cheat Sheet

## Purpose

Use this as a fast onboarding guide to resume frontend/UI work in the Delicious Route web app.

## At-a-Glance Stack

- Framework: Next.js App Router
- UI code root: web/src/app + web/src/components
- Styling: Tailwind + CSS variables (--dr-primary, --dr-neutral, --dr-text)
- Deployment: Vercel

## Core UI Entry Points

| Area                  | Route             | Primary UI Purpose                               |
| --------------------- | ----------------- | ------------------------------------------------ |
| Home                  | /                 | Discovery hub (tabs, vendors, featured content)  |
| Vendors list          | /vendors          | Browse all vendor cards                          |
| Vendor public detail  | /vendors/[id]     | Read-only vendor detail view                     |
| Vendor profile public | /vendor/[id]      | Promo claim experience + vendor public info      |
| Login                 | /login            | Credential sign-in                               |
| MFA verify            | /login/verify     | One-time code entry                              |
| Signup                | /signup           | Account creation + role/tier selection           |
| Customer profile      | /customer/profile | Preferences, favorites, claimed promos, password |
| Vendor profile        | /vendor/profile   | Vendor dashboard for profile/media/menu/promos   |
| Admin vendors         | /admin/vendors    | Vendor governance + verification actions         |

## Global Navigation

- Header component: web/src/components/SiteHeader.tsx
- Mounted in: web/src/app/layout.tsx
- Desktop:
  - Role-aware CTA (Sign in or View your profile)
- Mobile:
  - Hamburger slide-over menu
  - Includes sign-out item when authenticated

## Role-Based UI Access

| UI Capability       | Guest | Customer | Vendor  | Admin   |
| ------------------- | ----- | -------- | ------- | ------- |
| Browse home/vendors | Yes   | Yes      | Yes     | Yes     |
| Login/signup/reset  | Yes   | Limited  | Limited | Limited |
| Customer profile UI | No    | Yes      | No      | No      |
| Vendor profile UI   | No    | No       | Yes     | No      |
| Admin vendors page  | No    | No       | No      | Yes     |
| Mobile sign out     | No    | Yes      | Yes     | Yes     |

## Most Important UI Components

| Component               | File                                           | Quick Description                          |
| ----------------------- | ---------------------------------------------- | ------------------------------------------ |
| SiteHeader              | web/src/components/SiteHeader.tsx              | Global header + mobile menu + sign out     |
| FavoriteButton          | web/src/components/FavoriteButton.tsx          | Vendor favorite toggle/count               |
| FavoriteTrucksSection   | web/src/components/FavoriteTrucksSection.tsx   | Customer favorites summary + modal         |
| PromoCodeScanner        | web/src/components/PromoCodeScanner.tsx        | QR scanner in vendor promo redemption flow |
| BlockingStatusModal     | web/src/components/BlockingStatusModal.tsx     | Sticky status modal requiring close        |
| VendorManageMenuSection | web/src/components/VendorManageMenuSection.tsx | Vendor menu CRUD UI section                |
| VendorMenuSection       | web/src/components/VendorMenuSection.tsx       | Public vendor menu display                 |
| TierDowngradeButton     | web/src/components/TierDowngradeButton.tsx     | Tier downgrade with warning dialog         |
| PasswordPolicyDialog    | web/src/components/PasswordPolicyDialog.tsx    | Shared password requirement modal          |

## Critical UI Flows (Read First)

### 1) Login + MFA

- /login -> /login/verify -> role landing page
- Ensure code entry and challenge-expiry states remain clear.

### 2) Signup + Verification

- /signup -> /verify-email -> challenge/token verification page
- Keep resend/error messages explicit and user-friendly.

### 3) Reset Password

- /reset-password -> /reset-password/[token]
- Validate policy messaging and success redirect clarity.

### 4) Promo Claim/Redeem

- Customer claims on /vendor/[id]
- Vendor redeems on /vendor/profile
- Scanner + modal feedback must stay robust on mobile.

### 5) Mobile Header + Signout

- Verify menu open/close behavior and signout action on real devices.

## Vendor Profile UI Section Map

Route: /vendor/profile

1. Basic profile info
2. Permits/licensing fields
3. Social links
4. GPS update + hours
5. Profile/header/gallery media uploads
6. Menu management
7. Tier controls
8. Promo authoring
9. Promo redeem scanner + manual code entry
10. Password/security section

## Customer Profile UI Section Map

Route: /customer/profile

1. Preferences/profile fields
2. Favorites summary/list
3. Claimed promos list
4. Password change

## Home Page UI Section Map

Route: /

1. Featured content area
2. Tab navigation (Grub Reels, Vendors, Events)
3. Vendor discovery cards
4. Role-aware CTAs and quick navigation

## Quick Regression Checklist (UI)

- Header CTA and mobile menu render correctly by auth state.
- Mobile signout works and redirects home.
- Vendor card and detail pages render with image, hours, promo snippets.
- Customer favorites and claimed promos render expected states.
- Vendor scanner can start/stop and manual code fallback works.
- Blocking modal appears for redemption status messages.
- Login, MFA, reset, verification flows show useful error/success copy.

## UI Change Log Practice (Recommended)

For each frontend release, record:

1. Routes touched
2. Components touched
3. New user-facing states/messages
4. Mobile behavior changes
5. Screenshot/GIF references (optional)

---

Last updated: 2026-05-11
