# Delicious Route

Delicious Route is a food truck discovery and management app built with Next.js 15 (App Router). It lets customers discover vendors and gives vendors tools to manage their profiles.

## Project Structure

- `web/` – Next.js app (frontend + server actions)
  - `src/app/` – App Router pages and layouts
  - `src/app/vendor/` – Vendor login, signup, and profile flows
  - `db/schema.sql` – Database schema for users, vendors, roles, and related tables
- `Images/` – App logo and icon assets

## Getting Started

From the `web` directory:

```bash
cd web
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## Deploying

You can deploy the `web` app to Vercel or any platform that supports Next.js and Node.js. Make sure to configure the `@vercel/postgres` database and environment variables as needed.
