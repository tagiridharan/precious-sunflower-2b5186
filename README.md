# Belt — E-Waste EPR Chain of Custody

Belt is a mobile-friendly chain-of-custody application for informal e-waste collection. A collector logs an item, an aggregator verifies its weight, a recycler confirms receipt, and a brand or producer responsibility organisation reviews the EPR ledger and exports a CPCB-style report.

The interface uses plain HTML, CSS, and browser JavaScript so it is easy to copy and adapt. Shared records are stored in Netlify Database through a TypeScript Netlify Function and Drizzle ORM. A browser-side queue preserves submissions made while a device is offline and sends them when connectivity returns.

## Step-by-step setup

1. Create an empty folder and copy this project into it. Keep the directory structure shown below; the database imports depend on it.

   ```text
   belt/
   ├── db/
   │   ├── index.ts
   │   └── schema.ts
   ├── netlify/
   │   ├── database/migrations/
   │   └── functions/collections.mts
   ├── index.html
   ├── drizzle.config.ts
   ├── netlify.toml
   └── package.json
   ```

2. Install Node.js 22, then install the project packages.

   ```bash
   npm install
   ```

3. Start the Netlify development environment. This serves the page, the API, and the local database integration together.

   ```bash
   npm run dev
   ```

4. Open `http://localhost:8889`. Add a collector entry first. The photo scan is an offline prototype estimator, so its item and weight fields remain editable.

5. Open the Aggregator tab and enter demo PIN `1111`. Verify the weight and confirm pickup. A difference above 20% is automatically flagged.

6. Open the Recycler tab with PIN `2222`, confirm receipt, and issue the EPR credit.

7. Open Brand / PRO with PIN `3333`. Review credited weight and download the CPCB-ready text report.

8. Deploy by connecting the folder to Netlify or by running `netlify deploy`. Netlify provisions the managed Postgres database and applies the migration under `netlify/database/migrations` during deployment.

## How the code fits together

`index.html` contains the complete interface, translations, offline queue, camera estimator, voice entry, role views, and report export. All browser data operations call `/api/collections`.

`netlify/functions/collections.mts` exposes `GET`, `POST`, and `PATCH` operations, validates incoming fields, and reads or writes records with Drizzle.

`db/schema.ts` defines the collection ledger. `db/index.ts` creates the Netlify Database client. `drizzle.config.ts` points schema migrations at the directory Netlify applies automatically.

## Making changes

Edit colors and type styles in the CSS variables at the top of `index.html`. Add languages in the `T` translation object and `UI_LANGS` list. If you change database columns, update `db/schema.ts` and generate a migration:

```bash
npx drizzle-kit generate --name add_your_change
```

The PINs are intentionally visible demo controls, not production authentication. Replace them with organisation accounts before handling regulated or private production data.

## Key technologies

- HTML, CSS, and browser JavaScript
- Netlify Functions
- Netlify Database (managed Postgres)
- Drizzle ORM and Drizzle Kit
- Browser camera, geolocation, speech recognition, and offline APIs

