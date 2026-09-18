# Darukaa Earth

A nature-led geospatial workspace for carbon and biodiversity projects. React and Mapbox connect project boundaries to monthly observations, backed by FastAPI and PostgreSQL/PostGIS.

## Review

Choose **Explore the platform** for the read-only demo. Register to create your own projects and draw site boundaries. The demo contains synthetic observations, not verified environmental outcomes. Deployment and verification status are recorded in `docs/SUBMISSION.md`.

## Architecture

React + TypeScript + Vite serves an editorial landing page and dashboard. Tailwind CSS, customized shadcn-style Radix components, Motion, React Hook Form/Zod, TanStack Query, Lucide, and Chart.js support the interface. Mapbox and chart bundles load on demand. Fonts and optimized photographs are served locally.

One Render Docker service serves the React build and FastAPI API from the same origin. FastAPI uses SQLAlchemy, GeoAlchemy2, Alembic, Argon2 password hashes, and JWT cookies. Neon stores durable PostgreSQL data with PostGIS. No application data relies on Render's temporary filesystem.

## Schema

| Table        | Fields                                                  | Relationship         |
| ------------ | ------------------------------------------------------- | -------------------- |
| users        | UUID, unique email, name, password_hash, is_demo        | Owns projects        |
| projects     | UUID, owner_id, name, description, category, created_at | Belongs to user      |
| sites        | UUID, project_id, name, Polygon SRID 4326, area_ha      | Belongs to project   |
| measurements | UUID, site_id, date, carbon_tco2e, species_count        | Unique site and date |

Geometry has a GiST index. Authoritative area uses `ST_Area(geometry::geography)/10000` in hectares. The API rejects invalid, empty, open, self-intersecting, out-of-range, or antimeridian-crossing polygons. Browser area is only an estimate.

## Run locally

Requires Node 22.12+, Python 3.12, uv, and Docker or an existing PostGIS database.

```sh
cp .env.example .env
# Set JWT_SECRET (32+ characters), DEMO_PASSWORD (10+ characters), and VITE_MAPBOX_TOKEN.
npm ci
uv sync --project backend --frozen
docker compose up -d db
cd backend
uv run alembic upgrade head
uv run python -m app.seed
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal at the repository root, run `npm run dev` and open `http://localhost:5173`. Vite proxies `/api` to port 8000. Use localhost consistently because APP_ORIGIN protects mutations. On PowerShell use `Copy-Item .env.example .env` if preferred. With Neon, replace DATABASE_URL with its TLS connection string and omit Docker.

| Variable          | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| DATABASE_URL      | PostgreSQL URL, with TLS parameters for Neon               |
| JWT_SECRET        | Private signing secret, minimum 32 characters              |
| DEMO_PASSWORD     | Password for demo@darukaa.earth, minimum 10 characters     |
| APP_ORIGIN        | Exact browser origin                                       |
| COOKIE_SECURE     | false locally, true on public HTTPS                        |
| VITE_MAPBOX_TOKEN | Public URL-restricted Mapbox token, provided at build time |

Keep .env out of Git. The seed is idempotent: it creates only demo-owned data and refreshes the demo password from configuration.

## API and security

`/api/docs` documents registration/login/logout/current user, demo entry, projects list/create/detail, project sites list/create, site read/update, analytics, and health. GeoJSON carries polygon geometry.

Eight-hour JWT sessions use HttpOnly, SameSite=Lax cookies, Secure in production. Mutations require APP_ORIGIN. Every project/site query enforces ownership; foreign records return 404. Demo writes return 403. Database exceptions return a generic 503 without secrets. Logout clears the cookie. Password recovery, token revocation, and production-scale abuse prevention are outside this MVP; add an edge rate limiter before a broader launch.

## Checks and CI

```sh
npm run lint
npm run format:check
npm run build
uv run --project backend ruff check backend
uv run --project backend ruff format --check backend
cd backend
uv run pytest -q
```

Integration tests require actual PostGIS. Test-created records run inside a rollback transaction using savepoints. They cover sessions, persistence, geodesic area, access isolation, demo restrictions, invalid geometry, duplicate accounts, and origin checks. `scripts/browser_check.py` verifies the demo, charts, and responsive layouts using Python Playwright and captures screenshots.

Husky installs during npm ci. lint-staged formats/lints staged frontend and documentation files and runs Ruff on staged Python. CI independently runs checks on PRs and main pushes using locked dependencies and a PostGIS service container. Only successful main-branch checks trigger deployment of the tested Git SHA via the secret RENDER_DEPLOY_HOOK_URL.

## Deployment

Create a free Render Docker service connected to this private repo, or use render.yaml. Set the environment variables above, APP_ORIGIN to the actual HTTPS URL, COOKIE_SECURE=true, and the health path to /api/health. Disable Render auto-deploys to prevent bypassing CI. Add its secret deploy hook to GitHub Actions as RENDER_DEPLOY_HOOK_URL. If missing, CI reports deployment as pending.

The Docker build receives VITE_MAPBOX_TOKEN as a build argument. Startup applies migrations and runs the idempotent seed before Uvicorn. A dedicated migration job would be needed for multiple instances. Free Render services sleep after inactivity; first access can take time. Neon can suspend idle compute too. Restrict the Mapbox token to the deployed URL and localhost. A missing map token shows an honest configuration state, never a fake basemap.

## Data, design, and tradeoffs

Three regional scenarios in India contain six illustrative polygons and 12 monthly observations each for 2025. Synthetic data makes the demo reproducible and avoids implying verified measurements. Newly created sites have no measurements. Measurement ingestion, deletion, teams, file uploads, carbon trading, password recovery, and 3D are deliberately omitted.

The visual direction follows the supplied Verde reference: forest photography, cream/evergreen surfaces, serif headings, quiet controls, and a flat map. Charts have a tabular alternative; GeoJSON entry provides a keyboard alternative to drawing. Reduced-motion settings are respected.

Images use the Unsplash License: https://unsplash.com/license. Source image URLs are listed in /credits and scripts/download_assets.py. Photography illustrates the brand and does not depict sample sites. Cormorant Garamond and Manrope packages contain their font licenses. UI primitives follow shadcn/ui composition with Radix Dialog and Slot.

## Submission

The private repository is https://github.com/drowningFi5h/darukaa-earth. Word and screenshot outputs are generated under output/submission and excluded from Git. Reviewer invitations and job-portal upload remain separate actions. See docs/SUBMISSION.md for verified completion status.
