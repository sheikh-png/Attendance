# Deploying the Backend to Render

This document lists steps to deploy the `server/` backend on Render.com. It assumes your repository is pushed to GitHub (or GitLab) and connected to Render.

Checklist before deploying
- Ensure `server/.env` is NOT committed to the repo (it is already ignored by `.gitignore`).
- Save sensitive values as Render Environment Variables (do not use `.env` on Render).

Required environment variables (set these in Render dashboard):
- `MONGODB_URI` — your Atlas connection string (e.g. `mongodb+srv://.../attendance`)
- `JWT_SECRET` — a strong secret for JWT signing
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` — optional emergency credentials
- `PORT` — Render sets this automatically; the app reads `process.env.PORT`

Render Web Service settings
- Environment: `Node` (select Node version matching your app)
- Build Command: leave empty (no build step needed)
- Start Command: `npm start` (the `server/package.json` already defines `start` as `node server.js`)
- Root Directory: set to `/server` when creating the service
- Health check: set the health check path to `/healthz` (or `/`) so Render can verify service readiness

Deployment steps
1. Push your repository to GitHub.
2. On Render, create a new Web Service and connect your repository.
3. For the Service root, choose the `server` folder.
4. Set the start command to `npm start`.
5. Under Environment, add the variables listed above (`MONGODB_URI`, `JWT_SECRET`, ...).
6. Set the health check path to `/healthz`.
7. Create the service — Render will deploy the app and run `npm start`.

Post-deploy
- Monitor logs in Render. If Mongo cannot connect, confirm `MONGODB_URI` and Atlas IP/network access.
- Set CORS origin in the frontend or add `CLIENT_ORIGIN` if you want to restrict origins (server currently allows all origins via `cors()`).

Local test commands
```powershell
cd server
npm install
npm start
```

If you want, I can prepare a simple `render.yaml` file for infrastructure-as-code, or add a `Procfile`. Tell me which you prefer.
