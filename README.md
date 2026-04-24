# Live Q&A Monorepo

End-user portal, admin console, and a public display wall backed by **NestJS**, **PostgreSQL (Prisma)**, **Socket.IO**, and **Next.js (App Router)**.

## Structure

- `apps/web` — Next.js 15 + TypeScript + Tailwind + TanStack Query + Zustand
- `apps/server` — NestJS 11 API, JWT auth, Socket.IO gateway

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (optional, for PostgreSQL)

## 1. Database

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Copy environment files:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Default `DATABASE_URL` matches `docker-compose.yml` (`qa` / `qa` / `qa`).

## 2. Install & migrate

From the repository root:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:seed` creates an admin user and sample questions. Admin phone defaults to `+15550000001` (override with `ADMIN_PHONE` in `apps/server/.env`).

## 3. Run

```bash
npm run dev
```

- Attendee portal: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin) — sign in with the **same phone as `ADMIN_PHONE`**
- Wall: [http://localhost:3000/wall](http://localhost:3000/wall)

API (REST + Socket.IO): [http://localhost:4000](http://localhost:4000)

## Scripts

| Script        | Description                                      |
| ------------- | ------------------------------------------------ |
| `npm run dev` | Next.js + NestJS in watch mode                   |
| `npm run build` | Production build (server then web)             |
| `npm run start` | Run built apps (start servers after `build`)   |
| `npm run db:generate` | `prisma generate` (server workspace)       |
| `npm run db:migrate`  | `prisma migrate dev` (server workspace)    |
| `npm run db:push`     | `prisma db push` (quick schema sync)       |
| `npm run db:seed`     | Seed demo data                             |

## HTTP API

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| `POST` | `/auth/login` | — | Body: `{ name, phone }` — upserts user, returns JWT + user |
| `POST` | `/questions` | JWT | Create question (`pending`), emits `new_question` |
| `GET` | `/questions` | JWT | List questions; admins see all, attendees see their own |
| `GET` | `/questions/wall/feed` | — | Public bootstrap list for the wall (no phone in payload) |
| `PATCH` | `/questions/:id/answer` | JWT admin | Answer + `answered`, emits `question_answered` |

Query: `GET /questions?status=pending|answered|all` (admin).

## WebSocket events (Socket.IO)

Clients connect to the API origin (same port as HTTP). Namespaces: default (`/`).

| Event | Direction | Payload |
| ----- | --------- | ------- |
| `new_question` | server → clients | `{ question }` |
| `question_answered` | server → clients | `{ question }` |

The web app reconnects with backoff and refetches lists on `connect`.

## Environment variables

**Server (`apps/server/.env`)**

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing secret for access tokens |
| `JWT_EXPIRES_SEC` | JWT expiry in seconds (default `604800` = 7 days) |
| `PORT` | HTTP + Socket.IO port (default `4000`) |
| `WEB_ORIGINS` | Comma-separated CORS origins |
| `ADMIN_PHONE` | Normalized match (spaces stripped); this phone gets `role: admin` on login |
| `ADMIN_NAME` | Seed only (optional) |

**Web (`apps/web/.env`)**

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_API_URL` | REST base URL |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO server URL (usually same as API) |

## Deploy: Railway (API + Postgres) + Vercel (Next.js)

Deploy **in this order**: Railway first (you need the public API URL), then Vercel (point env vars at Railway).

### A. Railway — PostgreSQL

1. Open [Railway](https://railway.app), sign in, click **New Project**.
2. Choose **Database** → **Add PostgreSQL**. Wait until it is **Active**.
3. Open the Postgres service → **Variables** → copy **`DATABASE_URL`** (or use **Connect** to see the URL). You will reference this on the API service.

### B. Railway — NestJS API (`apps/server`)

1. In the same project, click **New** → **GitHub Repo** → select this repository.
2. Open the new **empty** service (or the one Railway created) → **Settings**:
   - **Root Directory**: `apps/server`
   - **Watch Paths** (optional): `apps/server/**` so only server changes redeploy the API.
3. **Settings** → **Networking** → **Generate Domain** (or add a custom domain). Copy the HTTPS URL, for example `https://your-api.up.railway.app`. This is your **API base URL** (no trailing slash).
4. **Variables** tab — add:

   | Name | Value |
   |------|--------|
   | `DATABASE_URL` | **Reference** the Postgres variable: click **Add Variable Reference** → choose Postgres → `DATABASE_URL`. |
   | `JWT_SECRET` | Long random string (e.g. `openssl rand -base64 48`). |
   | `JWT_EXPIRES_SEC` | `604800` (or your preference). |
   | `WEB_ORIGINS` | Your Vercel URL(s), comma-separated, **no trailing slashes**, e.g. `https://your-app.vercel.app,https://your-app-git-main-yourteam.vercel.app` for previews. |
   | `ADMIN_PHONE` | E.164-style phone matching how users type it (spaces stripped on server), e.g. `+15550000001`. |
   | `ADMIN_NAME` | Optional display name for seed/docs. |

   Railway injects **`PORT`** automatically — do not set it manually unless you know what you are doing.

5. **Settings** → **Deploy** → **Custom Build Command**:

   ```bash
   npm run build:railway
   ```

   This runs `prisma generate`, `prisma migrate deploy`, then `nest build`. The database must be reachable during build (linked `DATABASE_URL`).

6. **Custom Start Command** (if not auto-detected):

   ```bash
   npm run start
   ```

7. Trigger a deploy and check **Deployments** → **Build Logs** / **Deploy Logs** until the service is **Active**. Hit `https://YOUR-API.up.railway.app/questions/wall/feed` in a browser — you should get JSON (maybe `[]`).

**Optional — seed production once** (Railway **Shell** on the service, or a one-off command):

```bash
npx prisma db seed
```

Only if you want demo rows; `ADMIN_PHONE` is still enforced at login.

### C. Vercel — Next.js (`apps/web`)

1. Open [Vercel](https://vercel.com) → **Add New…** → **Project** → import the **same** GitHub repo.
2. **Configure Project**:
   - **Root Directory**: `apps/web` (click **Edit** next to the repo name).
   - Framework: **Next.js** (auto).
   - **Build Command**: `npm run build` (default).
   - **Install Command**: `npm install` (default).
3. **Environment Variables** (Production — repeat for **Preview** if you use preview URLs):

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_API_URL` | `https://your-api.up.railway.app` (your Railway public URL, **no** trailing slash). |
   | `NEXT_PUBLIC_SOCKET_URL` | Same as `NEXT_PUBLIC_API_URL` unless you split WebSocket to another host. |

4. **Deploy**. After it finishes, add your real Vercel URL(s) to Railway **`WEB_ORIGINS`** (comma-separated), then **Redeploy** the Railway API so CORS includes your frontend.

5. Smoke test: open the Vercel URL → `/wall` and `/`; sign in on `/admin` with **`ADMIN_PHONE`**.

### Checklist

- [ ] Railway Postgres running; `DATABASE_URL` referenced on the API service.
- [ ] API build uses `npm run build:railway`; deploy succeeds.
- [ ] API has a public **HTTPS** domain; `GET …/questions/wall/feed` works.
- [ ] Vercel `NEXT_PUBLIC_*` URLs match that Railway domain exactly (scheme + host, no trailing slash).
- [ ] `WEB_ORIGINS` on Railway lists every Vercel origin you use (production + previews if needed).

## Production notes

- Set strong `JWT_SECRET` and restrict `WEB_ORIGINS` to your real domains.
- Run `npm run build` then `npm run start` with `NODE_ENV=production` and a managed PostgreSQL instance.
- Apply schema with `cd apps/server && npx prisma migrate deploy` (after `DATABASE_URL` points at production).
- Terminate TLS at your edge (reverse proxy); keep JWT in `Authorization: Bearer` from the browser as implemented here.

## License

MIT
