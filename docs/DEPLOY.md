# 🚀 VisualOS — Deployment Guide

> [!IMPORTANT]  
> VisualOS is a modern React SPA powered by a **Supabase** backend. To deploy this application, you must configure both the frontend host (like Netlify or Vercel) and the backend database.

---

## 🏗️ Step 1: Backend Deployment (Supabase)

1. Create a new project at [Supabase.com](https://supabase.com/).
2. Navigate to the **SQL Editor**.
3. Copy the contents of `docs/supabase_schema.sql` and run it. This script automatically:
   - Creates all tables (`firms`, `items`, `orders`, etc.)
   - Enables **Row Level Security (RLS)** for multi-tenant data isolation.
   - Creates the necessary triggers for inventory management.
4. Go to **Project Settings → API** and copy your `Project URL` and `anon public key`.

---

## 🌐 Step 2: Frontend Deployment (Netlify)

> [!TIP]  
> Netlify is recommended as it provides free automatic HTTPS, unmetered edge caching, and seamless continuous integration from GitHub.

1. **Push your code to GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Ready for production"
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://app.netlify.com/signup)
   - Click **"Add new site" → "Import an existing project"**
   - Select your repository.

3. **Configure Build Settings**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

### 🔒 Step 3: Environment Variables
Before clicking deploy, you **MUST** add your Supabase credentials to Netlify's environment variables:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key-string` |

4. **Click Deploy** — Netlify will build the app and provide a live URL!

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|---------|
| **Blank Screen / 404** | The `netlify.toml` handles SPA routing. Ensure it exists in the root directory. |
| **Network Errors on Login** | Your Supabase environment variables are missing or incorrect in Netlify settings. |
| **Missing Icons/Styles** | Ensure your `vite.config.ts` has the correct `base` path if not deployed to a root domain. |
