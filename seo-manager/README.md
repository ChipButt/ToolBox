# Chip In SEO Manager V2 — Guided setup

Private, owner-only SEO delivery system, linked from the Chip In ToolBox dashboard.

## Live app

- Admin workspace: https://seo.chipinworks.co.uk/
- ToolBox entry: https://chipbutt.github.io/ToolBox/
- Hosting: Cloudflare Worker `chipin-seo-manager` with Cloudflare Access protecting `seo.chipinworks.co.uk`.
- Database: separate EU-region Cloudflare D1 `chipin-seo-manager`. Business records are not stored in this public GitHub repository.
- The workers.dev and Worker preview URLs are disabled.


## V2 beginner experience

The home page is now a **Start Here** workflow. Opening a client displays one recommended action at a time, with clear explanations and a four-step overview. The original detailed dashboard remains available under `Detailed view`.

- Start with **The Bulls Head** or **Chip In** practice client.
- The first recommended action is **Run the website check**. This public-homepage read-only check does **not** modify the website.
- Results explain each pass/review flag in plain English. A check is not a complete SEO audit or Google ranking report.
- The Google figures screen explains where to find **real** Search Console and Business Profile data. Google APIs are **not** connected yet.
- Checklist entries offer **What does this job mean?** plus a copyable, task-specific prompt to continue the real SEO work with ChatGPT.
- The client report stays blank until actual figures are recorded, rather than making up statistics.

### Important deployment detail

The Cloudflare Worker now serves its own `/app.js` and `/app.css` from bundled source at the private hostname. This avoids relying on GitHub Pages build status or a cross-origin static asset server for the admin screen. The separate `app.js` and `app.css` are still the maintainable source files. **When editing them, rebundle their complete contents into the Worker source and redeploy the Worker as well**; merely updating the files on GitHub does not update the private application.

## What is working

1. Multiple private client records with onboarding facts and account-access status.
2. Setup delivery checklist organised by research, technical SEO, on-page, local, and measurement.
3. Ongoing monthly checklist stored separately for each selected month.
4. Limited on-demand public homepage spot-check with persistent dated history.
5. Entry and editing of real monthly Search Console, Business Profile, and enquiry metrics.
6. Client-branded printable report (use Print > Save as PDF).
7. JSON backup download, manual permanent client deletion, and mobile-responsive admin UI.
8. Two internal pilot records: The Bulls Head and Chip In. No fabricated performance statistics or completed tasks.

## How to use, one step at a time

1. Open SEO Manager from ToolBox, sign in through Cloudflare Access.
2. Select an existing pilot or add a new client.
3. Fill in the client's factual brief and access status.
4. Work through the Foundations checklist, saving evidence in task notes.
5. Open Technical audit and run a public homepage spot-check. Review flagged items; a pass is not a ranking guarantee.
6. Enter real baseline figures from Google Search Console, Google Business Profile and agreed conversion tracking.
7. For ongoing clients, select the month in the checklist and record real work performed.
8. Open Client report, review claims and context, then use Print > Save as PDF.

## Scope and important limits

This does **not** yet connect to Google Search Console or Business Profile APIs. Monthly measurements are manually entered from the client's authorised source accounts. The technical check is a **homepage spot-check**, not a full crawl, keyword research engine, ranking tracker, accessibility audit, Core Web Vitals test, or competitor analysis. Those services need separate research and implementation work through the documented checklist. Do not sell the automated spot-check alone as a complete £795 SEO service.

Client onboarding is an administrator workflow and a copyable questionnaire; it does not provide a publicly accessible customer submission form. Private client documents, account passwords and access tokens should not be placed in notes. Customers should grant limited account roles themselves.

The printable report separates verified tasks from observed metrics. It does not claim that SEO alone caused changes; review seasonal fluctuations, branded searches and measurement definitions. Make sure client approval covers sharing reports or case studies.

For privacy, the admin app is protected by Cloudflare Access and Worker direct public URLs are off. Data can be downloaded as JSON or permanently deleted per client. A manual JSON backup cannot currently be restored from the app itself; arrange database-level recovery if needed. Keep exported files secure.

## Source

- `worker.js` — Cloudflare Worker API, D1 persistence, limited public technical audit.
- `app.js` — client management, task progress, reporting and onboarding.
- `app.css` — desktop/mobile/print styling.
- ToolBox `index.html` — direct link tile.

## Pricing scope used to shape the checklist

- Foundations (proposed) £795 once: one site/location, up to five pages, research/technical/local basics and delivery report.
- Growth (proposed) £295 per month: genuine ongoing work plus monitoring and transparent monthly report.
- Complex migrations, many locations/pages, large technical repairs, specialist legal/privacy work and paid subscriptions quoted separately.

These are suggested prices, not automatic invoices or promises of improved rankings.
