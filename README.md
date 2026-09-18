# Darukaa Earth

Darukaa Earth is a small platform for managing carbon and biodiversity projects. You can create a project, draw its sites on a map, and open a site to see its measurements over time.

[Try the app](https://darukaa-earth-gbph.onrender.com) · [Source code](https://github.com/drowningFi5h/darukaa-earth)

Choose **Explore the platform** to try the read-only demo without registering. To create projects and save boundaries, make an account. If you're already signed in, the home page takes you back to your own workspace.

The app runs on free hosting, so the first request after a period of inactivity can take a little longer.

## What's included

- Registration, login, logout, and session restoration.
- A project dashboard with search and a map of saved sites.
- Polygon drawing and editing, with a GeoJSON input option for keyboard use.
- Site areas calculated by PostGIS, rather than trusting the browser estimate.
- Monthly carbon and biodiversity charts, with a table showing the same values.
- A read-only demo with three projects, six sites, and twelve months of observations per site.

The demo observations are made up. They exist to show how the application works, not to claim real carbon removals or ecological outcomes. New sites have no measurements until data is added.

## How it fits together

The frontend uses React, TypeScript, and Vite. Mapbox GL JS handles the map and polygon drawing; Chart.js handles the charts. TanStack Query manages API requests and caching. The forms use React Hook Form and Zod, and the interface uses Tailwind CSS, Radix components, Motion, and Lucide icons.

FastAPI serves the API and the built frontend from the same Render service. The database lives separately on Neon and uses PostgreSQL with PostGIS. SQLAlchemy and GeoAlchemy2 handle database access, and Alembic handles schema migrations. Saved projects do not depend on Render's temporary filesystem.

Map and chart code loads when it is needed. Fonts and compressed photographs are served with the app.

## Database

| Table          | Main fields                                           | Relationship         |
| -------------- | ----------------------------------------------------- | -------------------- |
| `users`        | id, email, name, password_hash, is_demo               | Owns projects        |
| `projects`     | id, owner_id, name, description, category, created_at | Belongs to a user    |
| `sites`        | id, project_id, name, geometry, area_ha               | Belongs to a project |
| `measurements` | id, site_id, date, carbon_tco2e, species_count        | Belongs to a site    |

Site boundaries are WGS84 polygons with a GiST spatial index. The server calculates hectares using `ST_Area(geometry::geography) / 10000`. It rejects empty, open, self-intersecting, out-of-range, and antimeridian-crossing polygons. A unique constraint on site and date prevents duplicate measurements.

## Run it locally

You'll need Node 22.12 or later, Python 3.12, uv, and either Docker or an existing PostGIS database.

From the repository root:

```sh
cp .env.example .env
npm ci
uv sync --project backend --frozen
docker compose up -d db
```

On PowerShell, use `Copy-Item .env.example .env` instead of `cp` if needed. Fill in `.env` before starting the backend:

| Variable            | What to set                                                           |
| ------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`      | Your PostgreSQL connection string; use TLS for Neon                   |
| `JWT_SECRET`        | A private random secret, at least 32 characters                       |
| `DEMO_PASSWORD`     | A demo password of at least 10 characters                             |
| `APP_ORIGIN`        | `http://localhost:5173` locally; the exact HTTPS origin in production |
| `COOKIE_SECURE`     | `false` locally, `true` in production                                 |
| `VITE_MAPBOX_TOKEN` | A public Mapbox token, restricted to the app's URLs                   |

If you're using Neon, supply its connection string and skip the Docker command. Keep `.env` out of Git.

Start the API:

```sh
cd backend
uv run alembic upgrade head
uv run python -m app.seed
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal, from the repository root:

```sh
npm run dev
```

Open `http://localhost:5173`. Use `localhost` consistently: the API checks the browser's origin for requests that change data. Vite forwards `/api` requests to the backend on port 8000.

Running the seed command again is safe. It leaves registered users' projects alone and refreshes the demo password from the environment.

## API and authentication

Open `/api/docs` for the API reference. It covers authentication, projects, sites, analytics, and the database health check. Site boundaries are sent as GeoJSON.

Passwords are hashed with Argon2. JWT sessions last eight hours and use HttpOnly cookies, with Secure enabled in production and SameSite protection. Requests that change data must come from `APP_ORIGIN`.

Project and site requests check ownership. Requests for another user's records return 404, and writes from the demo account return 403. Logout clears the session cookie. Database errors return a generic response without exposing connection details.

## Checks and deployment

Run the code checks from the repository root:

```sh
npm run lint
npm run format:check
npm run build
uv run --project backend ruff check backend
uv run --project backend ruff format --check backend
```

Run the integration tests from `backend`:

```sh
uv run pytest -q
```

These tests need a migrated PostGIS database. They use rollback transactions and savepoints to avoid leaving test records behind. They cover authentication, ownership, demo restrictions, site persistence, area calculations, invalid geometry, and origin protection.

Browser checks use Python Playwright. They run with Microsoft Edge on Windows or installed Playwright Chromium elsewhere. Set `BASE_URL` to test the deployed app instead of localhost.

```sh
npm run test:e2e
uv run --project backend --with playwright python scripts/browser_write_check.py
uv run --project backend --with playwright python scripts/home_navigation_check.py
uv run --project backend --with playwright python scripts/hero_layout_check.py
```

The write and navigation checks create temporary verification accounts. `scripts/cleanup_browser_tests.py` removes accounts matching those test names and their test-only projects. Browser checks currently run separately from CI.

Husky installs during `npm ci`. Before each commit, lint-staged runs Prettier and ESLint on changed frontend files and Ruff on changed Python files.

[The GitHub Actions workflow](.github/workflows/ci.yml) runs on pull requests and pushes to `main`. It checks formatting and linting, builds the frontend, applies migrations, and runs the backend tests against a PostGIS service container. A successful push to `main` deploys that exact commit to Render. The workflow waits for the release to become live and fails if the deployment fails.

### Hosting configuration

The app uses a Render Docker service and a Neon PostGIS database. `render.yaml` and the Dockerfile are included in the repository.

Set the environment variables listed above in Render, use `/api/health` as the health-check path, and turn off Render's own automatic deployments so they cannot bypass CI. Set the GitHub Actions secrets `RENDER_API_KEY` and `RENDER_SERVICE_ID`.

An optional `RENDER_DEPLOY_HOOK_URL` can trigger deployment instead. This setup uses Render's authenticated deploy API; the API credentials are also used to check release status.

The Mapbox token is supplied at build time. Startup applies migrations and runs the seed before starting Uvicorn. For a larger deployment with multiple instances, migrations should move to a separate job.

## Demo data and trade-offs

The demo uses illustrative scenarios in the Western Ghats, Sundarbans, and Kaziranga, with twelve monthly observations for 2025. A deterministic sample dataset makes the charts easy to review and avoids relying on an external measurement provider during the demo. The photographs are illustrative too; they are not photographs of the saved sites.

The scope is project creation, site mapping, and reviewing measurements. There is no measurement-upload interface, team management, deletion flow, password recovery, or carbon trading. Token revocation and production-scale rate limiting would also need attention before a wider launch.

The interface follows the supplied forest-and-cream design reference. It stays in 2D, respects reduced-motion preferences, and provides text alternatives for the charts and polygon input. Render and Neon can both pause after inactivity, which is the main trade-off of this hosting setup.

## Credits and submission

Photographs are used under the [Unsplash License](https://unsplash.com/license). Source URLs are listed on the app's `/credits` page and in `scripts/download_assets.py`. Cormorant Garamond and Manrope are bundled through their font packages, which include their licenses.

The repository is public, so reviewers do not need invitations. The Word document and screenshots are in `output/submission` locally and are excluded from Git. The document includes the live URL, repository link, setup overview, and demo credentials. Uploading it through the applied-job page is still a separate step. See [the submission checklist](docs/SUBMISSION.md) for the delivery status.
