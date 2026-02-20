# Deploying to Netlify

## Why Netlify?
- **No credit card required** — Completely free tier signup
- **Won't charge without asking** — Stops serving when limits hit, never auto-charges
- **Free tier**: 100 GB bandwidth/month, 300 build minutes/month
- **Automatic HTTPS** and custom domain support

---

## Option A: Deploy from Git (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/InventoryManagementSystem.git
   git push -u origin main
   ```

2. **Go to [netlify.com](https://app.netlify.com/signup)** and sign up with GitHub (no card needed)

3. **Click "Add new site" → "Import an existing project"**

4. **Select your repository** and confirm these auto-detected settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

5. **Click Deploy** — Netlify will build and give you a URL like `https://your-site-name.netlify.app`

6. **Auto-deploy**: Every `git push` to `main` will auto-deploy!

---

## Option B: Manual Deploy (No Git Needed)

1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Go to [app.netlify.com](https://app.netlify.com)**

3. **Drag and drop** the `dist/` folder onto the Netlify dashboard

4. Done! Your site is live.

---

## Configuration

The `netlify.toml` file in the project root handles:
- **Build command**: `npm run build` (runs `tsc --noEmit && vite build`)
- **Publish directory**: `dist` (Vite output)
- **SPA redirect**: All routes → `index.html` (for React Router)

---

## Custom Domain (Optional)

1. Go to **Site settings → Domain management**
2. Add your custom domain
3. Netlify provides free SSL automatically

---

## Environment

No environment variables are needed — the app is fully client-side with IndexedDB.

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Build fails | Run `npm run build` locally first to check |
| Routes 404 | The `netlify.toml` redirect rule handles this |
| Slow first load | Vite tree-shakes unused code; check bundle size with `npx vite build --report` |
