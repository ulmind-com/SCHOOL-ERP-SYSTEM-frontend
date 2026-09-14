# Scholarly ERP — Web

Next.js front end for a multi-tenant School / College / University ERP.

The API lives in a separate repository:
**[SCHOOL-ERP-SYSTEM-backend](https://github.com/ulmind-com/SCHOOL-ERP-SYSTEM-backend)**

---

## Running locally

The API must be running first (see the backend repo — it defaults to port 8010).

```bash
cp .env.example .env.local    # point NEXT_PUBLIC_API_URL at the API
npm install
npm run dev
```

Open <http://localhost:3000>. Sign in at `/login`; use **Platform sign-in** for
the company console.

```bash
npm run typecheck
npm run build        # writes to .next-build, not .next
```

> `next build` uses a separate output directory on purpose. Building into
> `.next` while `next dev` is running overwrites the chunks the dev server is
> serving, and every page 404s until it is restarted. `vercel.json` sets
> `outputDirectory` to match.

---

## Deploying (Vercel)

The API deploys separately to Render. Deploy **the API first** — this app needs
its URL at build time.

1. **Vercel → Add New → Project →** import this repository. The framework is
   detected automatically; `vercel.json` supplies the rest.
2. **Environment Variables**, for *Production*, *Preview* and *Development*:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | the Render API's URL, no trailing slash |
   | `NEXT_PUBLIC_APP_NAME` | `Scholarly` |
   | `NEXT_PUBLIC_DEPLOYMENT_MODE` | `saas` |
   | `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | `https://ik.imagekit.io/<your id>` |

3. **Deploy**, then add the resulting URL to the API's `CORS_ORIGINS`. Until you
   do, every request from the browser is blocked.

> `NEXT_PUBLIC_*` values are inlined at build time, not read at runtime.
> Changing one needs a **redeploy** — a restart will not pick it up.

`regions: ["bom1"]` puts the serverless functions in Mumbai, next to the
database. Move it if your Atlas cluster lives elsewhere.

---

## Layout

```
src/
  app/(auth)/       sign-in
  app/(app)/        the institution workspace — sidebar shell
  app/(platform)/   the company console — dark chrome, separate layout
  components/
    ui/             button · card · table · drawer · inputs · charts
    resource/       the declarative resource screen and its definitions
    layout/         sidebar · topbar · page frame
  hooks/            data fetching, downloads
  lib/              api client · session store · design tokens
```

### How it is put together

**The sidebar is data, not code.** `/auth/me` returns a navigation payload the
API derived from the caller's permissions × the institution's enabled modules.
A teacher, an accountant and a parent get three different products out of one
build, and switching a module off in settings removes it everywhere at once.

**Resources are declared, not hand-written.** `ResourceScreen` takes a
description — columns, form fields, filters, permission module — and renders the
list, the create/edit drawer and the delete confirmation. It mirrors the API's
own CRUD factory, so ~25 screens are a config object each. Anything bespoke (the
attendance register, the timetable grid, marks entry, fee collection) is a
hand-written page.

**Two chromes, deliberately different.** The institution workspace is light with
a white sidebar; the platform console is dark. Nobody should ever be unsure
which side of the product they are looking at.

**Overlays are portalled to `<body>`.** Page content sits inside an entrance
animation, and a CSS transform on an ancestor makes `position: fixed` resolve
against that ancestor rather than the viewport — which collapses a full-height
drawer into the header's box.

**Token refresh is a single shared promise.** A dashboard fires six queries at
once; on an expired token that would otherwise start six refreshes, five of which
rotate a token the sixth is still using, and the user is logged out mid-session.

---

## Design

Palette and type are a cool grey canvas, white cards with generous radii,
near-black as the only strong colour, and pastel butter / blush / lilac reserved
for stat tiles so the numbers carry the page instead of the chrome. Type is
Plus Jakarta Sans.

Every colour is a CSS variable, so an institution's branding settings restyle the
product at runtime rather than at build time.

---

## Shape of it

| | |
|---|---|
| Routes | 63 |
| Declarative resource screens | ~25 |
| Bespoke screens | attendance register · timetable grid · marks entry · fee collection · invoicing · reports · messaging · assistant · live tracking · biometrics · library · payroll · roles editor · platform console |
