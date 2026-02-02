# Account-Management

A single-user, multi-account web application for analyzing and presenting Autodesk product usage data.
This app is designed specifically for an **Autodesk Enterprise Account Manager** to understand adoption,
consumption, and value realization across multiple customer accounts — and to produce
**presentation-ready charts and screenshots** for customer-facing decks.

This README is the **authoritative source of truth** for this project.
Cursor (and any developer/AI working in this repo) should read this file first.

---

## Current status (important)

✅ **Next.js app has already been created**  
- Framework: **Next.js (App Router)**
- Language: **TypeScript**
- Styling: **Tailwind CSS**
- Package manager: **pnpm**
- Directory structure: **`src/` enabled**
- App runs locally at: `http://localhost:3000`

🚧 **No application-specific features have been built yet**  
We are intentionally starting from a clean baseline.  
All architecture, data modeling, and UI decisions below are confirmed and should be followed.

---

## Problem this app solves

As an Enterprise Account Manager, I manage multiple Autodesk customer accounts.
Each account has **multiple usage datasets** that come from different Autodesk systems and
have different schemas and meanings.

This app helps me:
- Understand **how customers actually use Autodesk products**
- Compare **adoption vs consumption**
- Identify **growth, risk, and expansion opportunities**
- Create **clean, executive-ready visualizations** for customer presentations
- Manage product naming, aliases, colors, and logos consistently across charts

---

## Target user

- **Single user (me)**
- Power user
- Comfortable with data, but values **speed, clarity, and polish**
- The app must scale to **many accounts**, even if there is only one user

---

## Core design principles

1. **Account-first**
   - Everything is scoped to an account
   - URLs, navigation, and dashboards are account-centric

2. **Configurable, not hard-coded**
   - Product names, aliases, colors, and logos must be configurable
   - Dataset formats must be extendable

3. **Presentation-quality visuals**
   - Charts must look good on a black background
   - Screenshots should drop cleanly into PowerPoint / Google Slides

4. **Traceability**
   - Every data point must trace back to a specific uploaded dataset
   - Historical uploads are preserved (no destructive overwrites)

---

## Supported data (MVP)

Each **account** can have multiple datasets uploaded.
These are the currently supported dataset types.

### 1. ACC / BIM 360 / PlanGrid usage (Excel)
- Event-based usage
- Rich project + feature context
- Used for adoption and workflow analysis

Key fields:
- Event Date
- User Email
- Project Name
- Product / Sub Product
- Feature Category
- Project ID
- Account metadata (CSN, Geo, SFDC ID)

---

### 2. Daily User – Cloud consumption (CSV)
- Token-based consumption
- Per-user, per-day
- No project context

Key fields:
- usageDate
- productName
- userName
- tokensConsumed

---

### 3. Daily User – Desktop consumption (CSV)
- Desktop product usage
- Tokens, hours, and use count
- Includes machine and license server info

Key fields:
- usageDate
- productName
- productVersion
- userName
- tokensConsumed
- usageHours
- useCount

---

### 4. Manual Adjustments (CSV)
- Administrative / contractual adjustments
- Used as **annotations**, not primary usage

Key fields:
- usageDate
- transactionDate
- reasonType
- productName
- tokensConsumed
- reasonComment

---

## Upload & ingestion model

- All data is uploaded **in-app**
- Files are stored in **Supabase Storage**
- Dataset type is **auto-detected** by header signatures
- Uploads are **immutable**
- Multiple uploads of the same type are allowed and preserved

Each upload creates:
- A `datasets` record (metadata, status, date range)
- Normalized rows in `usage_facts`
- A permanent link between facts and the upload that created them

---

## Canonical data model (Supabase / Postgres)

### accounts
- id (uuid)
- name (primary identifier)
- slug (used in URLs)
- sfdc_account_id (optional)
- notes
- created_at

### datasets
- id
- account_id
- dataset_type
- original_filename
- storage_path
- uploaded_at
- status (queued / processed / failed)
- detected_headers (json)
- min_date / max_date
- row_count
- error_message

### usage_facts
Canonical, normalized daily facts table.

- account_id
- dataset_id
- date (daily)
- dataset_type
- product_key
- user_key
- project_key (nullable)
- metric_tokens (nullable)
- metric_events (nullable)
- usage_hours (nullable)
- use_count (nullable)
- dimensions (jsonb)

### products
- product_key
- canonical_name
- category (Construction / Cloud / Desktop)
- color (hex)
- logo_url
- sort_order

### product_aliases
- alias
- product_key

---

## Dashboards

### Default KPIs (top strip)
These five KPIs must appear by default:

1. Active Users (daily average)
2. Total Tokens Consumed
3. Projects Active
4. Events Count
5. Power Users % (top 10% share)

Additional KPIs may be added later, but these are the default.

---

### Visualizations (MVP)
- Stacked area time-series (by product)
- Tokens consumed over time
- Events over time
- Top users table
- Project activity visualization (heatmap or MVP alternative)

---

## Time handling

- **Default granularity:** Daily
- User can switch to:
  - Weekly
  - Monthly
  - Quarterly
  - Annual
- Aggregation should be done server-side where possible (`date_trunc`)

---

## Presentation Mode

The dashboard must support a **Presentation Mode**:
- Larger typography
- More whitespace
- Hidden admin / upload controls
- Optimized for screenshots

Can be triggered by:
- UI toggle, or
- URL param (e.g. `?mode=present`)

---

## Chart export & copy

- Charts are displayed on a **black background**
- Each chart has per-chart controls:
  - **Copy to Clipboard** (primary)
  - Export PNG (secondary)
- Exports must:
  - Capture **charts only** (no nav, no filters)
  - Use a **black background**
  - Be high resolution (pixelRatio ≥ 2)
- Use `html-to-image` + Clipboard API

---

## Styling & branding

- Primary background: Autodesk Black (#000000)
- Primary text: White (#FFFFFF)
- Accent color: Autodesk accent (Hello Yellow or configured equivalent)
- Product colors come from the `products` table
- Do NOT hard-code product colors in charts

---

## App structure (App Router)

Expected structure (high-level):

- src/app/layout.tsx
- src/app/page.tsx
- src/app/accounts/
- src/app/accounts/[slug]/dashboard
- src/app/accounts/[slug]/datasets
- src/app/admin/products
- src/components/
- src/lib/ingest/
- src/lib/export/

Exact filenames may evolve, but this structure should guide development.

---

## What needs to be done next (priority order)

### Phase 1 — Foundation
- Add global black theme
- Build navigation bar
- Create Accounts list + create account flow
- Initialize Supabase local and env vars

### Phase 2 — Data layer
- Create Supabase tables
- Create Supabase Storage bucket
- Implement dataset upload UI
- Store upload metadata in `datasets`

### Phase 3 — Ingestion
- Implement dataset auto-detection
- Build ingestion adapters (one per dataset type)
- Normalize data into `usage_facts`

### Phase 4 — Dashboards
- Build KPI strip
- Build Recharts-based charts
- Wire charts to real data
- Add Presentation Mode

### Phase 5 — Admin & polish
- Product & alias management UI
- Manual adjustment overlays
- Export / copy UX polish

---

## Non-negotiables

- No hard-coded product names or colors
- No destructive overwrites of data
- Always preserve dataset history
- Never ask for or commit secrets
- Prefer small, verifiable steps

---

## Final note to Cursor / future developer

This project is intentionally opinionated.
Do not shortcut the data model or hard-code assumptions.
The value of this app comes from **clarity, trust, and presentation quality**.

If unsure, follow this README.

