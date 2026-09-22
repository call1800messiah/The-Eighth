# TheEighth

Angular 18 app for managing tabletop RPG campaigns, backed by Supabase
(PostgreSQL + Auth + Storage + Realtime). Supports multi-tenant deployments for
different game systems.

## Development server

* Create a `.env` file in the root directory of the project:

```
NG_APP_TENANT=YOUR_TENANT_NAME
```

* Create a `src/environments/environment.ts` file pointing at your Supabase
  instance (this file is gitignored):

```javascript
export const environment = {
  name: 'dev',
  production: false,
  tenant: process.env.NG_APP_TENANT.trim(),
  tenantData: {
    YOUR_TENANT_NAME: {
      supabase: {
        url: 'http://127.0.0.1:55431',
        anonKey: 'sb_publishable_...',
      },
    },
  },
};
```

* Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app
  will automatically reload if you change any of the source files.

### Local Supabase

The Supabase CLI config lives in `supabase/config.toml`. The API port is 55431
rather than the default 54321, which falls inside a Windows reserved range.

```bash
npx supabase start     # start the local stack
npm run db:reset       # reset, re-apply migrations, reseed
```

## Build

Run `ng build` to build the project. The build artifacts will be stored in the
`dist/` directory.

## Test

```bash
ng test                                              # watch mode
ng test --watch=false --browsers=ChromeHeadless      # single run
```

Note that the suite is not currently green — see the Testing section of
`CLAUDE.md` for the known-failure baseline.

## Deploy

The app deploys as a Docker image alongside a **separately managed** Supabase
stack (`deploy/supabase/`). It is not deployed to Firebase Hosting.

### Prerequisites

* Create `src/environments/environment.prod.ts` with the same shape as the dev
  file, but with `production: true` and an **empty** `supabase.url`. The client
  then falls back to `window.location.origin` and the app's own nginx proxies
  the Supabase routes, so the browser only ever talks to one origin. The anon
  key is baked in at build time from `deploy/supabase/.env`.
* On the server, once: `docker network create supabase`

### Deployment

```bash
# 1. Build the image and deployment archive
powershell -File scripts/package-for-deploy.ps1   # Windows
bash scripts/package-for-deploy.sh                # Linux

# 2. Copy the-eighth-app.tar and the-eighth-deploy-*.tar to the server, then:
docker load -i the-eighth-app.tar
tar xf the-eighth-deploy-*.tar

# 3. Create or update the Portainer stack from docker-compose.portainer.yml
```

For a brand-new database, apply the schema first:

```bash
bash scripts/run-migrations.sh --schema
```

See `docker-compose.portainer.yml` for the full server-side sequence and
`CLAUDE.md` for architecture notes.
