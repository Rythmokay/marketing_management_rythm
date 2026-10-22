# Deploying rythm_marketing_management on Dokploy

This is a separate copy of the Marketing Management Portal. It has **its own Dokploy project,
its own PostgreSQL database and its own secrets**: it shares nothing with the original
`marketing-management-portal` deployment.

The whole portal (React web app + Spring Boot API) builds into **one Docker image** from the
`Dockerfile` in this repository. Data lives in a **PostgreSQL** database that Dokploy runs
separately. Nothing secret is stored in the repository: every password goes into Dokploy's
Environment settings.

## 1. Create the PostgreSQL database

1. In Dokploy: open (or **Create Project**) `marketing_management`.
2. Inside it: **Create Service → Database → PostgreSQL**, e.g. name `rythm-marketing-db`,
   database name `rythm_marketing`, a user and a new password.
3. Deploy the database and note its **Internal Credentials**:

| Dokploy field | Goes into variable |
|---|---|
| Internal Host (e.g. `marketing-management-rythm-marketing-db-xxxxxx`) | `DB_HOST` |
| Internal Port (usually `5432`) | `DB_PORT` |
| Database Name | `DB_NAME` |
| User | `DB_USERNAME` |
| Password | `DB_PASSWORD` |

The app and the database must be in the **same Dokploy project** so the internal host name resolves.
The tables are created automatically on the first start.

## 2. Create the application

1. In the same project: **Create Service → Application**.
2. **Provider:** GitHub → the **rythm_marketing_management** repository (not the original portal's), branch `main`.
3. **Build Type:** `Dockerfile` (path: `Dockerfile`, context: `.`).

## 3. Environment variables

In the application's **Environment** tab, paste the contents of your private
`.env.dokploy-app` file (kept on your computer, never in git), or fill in this template:

```env
SPRING_PROFILES_ACTIVE=prod
DB_HOST=<Internal Host from step 1>
DB_PORT=5432
DB_NAME=<Database Name from step 1>
DB_USERNAME=<User from step 1>
DB_PASSWORD=<Password from step 1>
JWT_SECRET=<output of: openssl rand -base64 48>
APP_ADMIN_PASSWORD=<password for the "admin" account>
GEMINI_API_KEY=<optional: key from https://aistudio.google.com/apikey>
```

- Use a **new** `JWT_SECRET` and `APP_ADMIN_PASSWORD`, not the original portal's.
- `JWT_SECRET` signs everyone's login. Generate it once and keep it; changing it signs everyone out.
- `APP_ADMIN_PASSWORD` is used **only on the very first start** (empty database) to create the
  `admin` account. Afterwards, change passwords on the **Marketing Team** page.
- The app refuses to start if `JWT_SECRET` or `APP_ADMIN_PASSWORD` is missing, so a deploy can't
  silently fall back to weak defaults.
- `GEMINI_API_KEY` is optional. It powers **Find review with Gemini** in a product's tracking form,
  which searches the influencer's YouTube channel for the review video. `GEMINI_MODEL` (default
  `gemini-flash-latest`) picks the model.

## 4. Domain and port

**Domains** tab → add your domain, **Container Port `8080`**, enable HTTPS (Let's Encrypt).

## 5. Deploy and first sign-in

1. Click **Deploy**. The first build takes a few minutes (it builds the web app and the API).
2. Health check: `https://<your-domain>/api/v1/health` returns `{"status":"UP"}`.
3. Open `https://<your-domain>` and sign in as **`admin`** with `APP_ADMIN_PASSWORD`.
4. Go to **Marketing Team** and add the team members (they are not copied from a local
   computer: the new database starts with the 30 influencers, 13 products and their tracking
   from `src/main/resources/seed/influencers.json`, plus the `admin` account).

## Updating

Push to `main`, then **Deploy** again in Dokploy (or enable **Auto Deploy**). Data in PostgreSQL
is kept; new tables or columns are added automatically.

## Run the production setup locally

```bash
cp .env.example .env     # fill in DB_PASSWORD, JWT_SECRET, APP_ADMIN_PASSWORD (DB_HOST is ignored here)
docker compose up --build
# open http://localhost:8081
```

## Local development (no Docker)

```bash
./gradlew bootRun            # API on :8080 with a local H2 database in ./data
cd frontend && npm run dev   # web app on :5173 (API calls are forwarded to :8080)
```
