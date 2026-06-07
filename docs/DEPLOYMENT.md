# Deployment

## Infrastructure

| Component | Service | Plan |
|---|---|---|
| Frontend | Railway (static) | Free tier |
| Backend API | Railway (Node.js) | Free tier |
| Database | Supabase | Free tier |
| CI/CD | GitHub Actions | Free |

Railway free tier limits: 500 hours/month execution, $5 credit/month (sufficient for 2-3 users, low traffic). Backend sleeps after inactivity — first request cold starts in ~2s. Acceptable for internal tool.

---

## Repository Layout for Deployment

```
swarna-ledger/
├── client/       ← Railway static site (Vite build)
├── server/       ← Railway Node.js service
└── railway.json  ← Optional: multi-service config
```

---

## GitHub Actions

### `.github/workflows/ci.yml` — Run on every PR

```yaml
name: CI

on:
  pull_request:
    branches: [main, dev]

jobs:
  test-client:
    name: Client Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: client

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: client/package-lock.json

      - run: npm ci
      - run: npm run test:run          # vitest run (no watch)
      - run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          directory: client/coverage

  test-server:
    name: Server Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: server

    env:
      JWT_SECRET: test-secret-for-ci-only-not-real
      NODE_ENV: test

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json

      - run: npm ci
      - run: npm run test:run

  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd client && npm ci && npm run lint
      - run: cd server && npm ci && npm run lint
```

---

### `.github/workflows/deploy.yml` — Deploy on push to main

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Railway
    runs-on: ubuntu-latest
    # Only deploy if CI passed (tests run on PR; this just deploys)

    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy Client
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --service swarna-client --detach

      - name: Deploy Server
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --service swarna-server --detach
```

---

## Railway Setup (Manual, One-Time)

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### 2. Create Project
```bash
railway init
# Name: swarna-ledger
```

### 3. Create Two Services

```bash
# Service 1: API server
railway service create --name swarna-server
railway service connect swarna-server
railway variables set \
  PORT=3001 \
  NODE_ENV=production \
  JWT_SECRET=<generated_secret> \
  JWT_EXPIRES_IN=7d \
  SUPABASE_URL=<your_supabase_url> \
  SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key> \
  CORS_ORIGIN=https://swarna-client.railway.app

# Service 2: Client (Vite static)
railway service create --name swarna-client
railway service connect swarna-client
railway variables set \
  VITE_API_BASE_URL=https://swarna-server.railway.app/api \
  VITE_SUPABASE_URL=<your_supabase_url> \
  VITE_SUPABASE_ANON_KEY=<your_anon_key>
```

### 4. Set Build Commands

**swarna-server** (railway.json in server/):
```json
{
  "$schema": "https://railway.app/railway-schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "node src/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**swarna-client** (railway.json in client/):
```json
{
  "$schema": "https://railway.app/railway-schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npx serve -s dist -l 3000"
  }
}
```

### 5. Add RAILWAY_TOKEN to GitHub Secrets
- Railway dashboard → Project → Settings → Tokens → Create token
- GitHub repo → Settings → Secrets → Actions → New secret: `RAILWAY_TOKEN`

---

## Client `package.json` Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .js,.jsx"
  }
}
```

## Server `package.json` Scripts

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint src --ext .js"
  }
}
```

---

## Supabase Migrations in CI/Production

Migrations run separately via Supabase CLI — not in the Railway deploy pipeline. Run manually when schema changes:

```bash
# Push pending migrations to production Supabase
supabase db push --project-ref <your_project_ref>
```

For automated migration on deploy, add to `deploy.yml`:
```yaml
- name: Run DB Migrations
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
  run: |
    npx supabase db push --project-ref $SUPABASE_PROJECT_REF
```

---

## Environment Variables Checklist

### GitHub Secrets Required
```
RAILWAY_TOKEN
SUPABASE_ACCESS_TOKEN    (for migration automation)
SUPABASE_PROJECT_REF     (project reference slug)
```

### Railway Service Variables (swarna-server)
```
PORT                     3001
NODE_ENV                 production
JWT_SECRET               <32+ char random hex>
JWT_EXPIRES_IN           7d
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CORS_ORIGIN              https://swarna-client.railway.app
```

### Railway Service Variables (swarna-client)
```
VITE_API_BASE_URL        https://swarna-server.railway.app/api
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_ENV             production
```

---

## Monitoring (Minimal)

Railway free tier includes:
- Build + deployment logs (Railway dashboard)
- Basic HTTP metrics
- Error logs via `console.error` (visible in Railway logs)

No additional monitoring service needed for 2-3 users. If the app goes down, check Railway logs first.

Health check endpoint:
```js
// server: GET /health — no auth
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));
```
Railway can ping this for uptime checks.
