# VisualOS — Setup & Deployment Guide

## Prerequisites

- **Node.js** ≥ 18 (recommended: v20 LTS)
- **npm** ≥ 9

Verify:
```bash
node --version
npm --version
```

---

## 1. Clone / Download

```bash
# If you have git:
git clone <your-repo-url>
cd InventoryManagementSystem

# Or just open the project folder
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Run Development Server

```bash
npm run dev
```

App opens at **http://localhost:5173**

> **Note:** The dev server includes COOP/COEP headers for FFmpeg.wasm `SharedArrayBuffer` support.

## 4. Build for Production

```bash
npm run build
```

Output goes to `dist/` folder. The PWA service worker is auto-generated.

## 5. Preview Production Build

```bash
npm run preview
```

---

## Free Hosting Options

### Option A: Netlify (Recommended — Easiest)

1. **Sign up** at [netlify.com](https://www.netlify.com) (free tier)
2. Drag-and-drop the `dist/` folder onto the Netlify dashboard
3. **Or** connect your GitHub repo:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **IMPORTANT** — Add headers for FFmpeg. Create `public/_headers`:
   ```
   /*
     Cross-Origin-Opener-Policy: same-origin
     Cross-Origin-Embedder-Policy: require-corp
   ```
5. Your PWA is now live! Access it from your phone's browser and tap "Add to Home Screen"

### Option B: Vercel (Also Free)

1. **Sign up** at [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Framework Preset: **Vite**
4. Add `vercel.json` to project root:
   ```json
   {
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
           { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
         ]
       }
     ]
   }
   ```
5. Deploy!

### Option C: GitHub Pages (Free, No Backend)

1. Install: `npm install -D gh-pages`
2. Add to `package.json` scripts: `"deploy": "npm run build && gh-pages -d dist"`
3. Set `base` in `vite.config.ts` to your repo name: `base: '/your-repo-name/'`
4. Run: `npm run deploy`

> ⚠️ GitHub Pages doesn't support custom headers, so FFmpeg features won't work there. Use Netlify or Vercel instead.

### Option D: Cloudflare Pages (Free, Fast CDN)

1. **Sign up** at [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect GitHub repo
3. Build command: `npm run build`, output: `dist`
4. Add `_headers` file in `public/` (same as Netlify)

---

## Installing on Your Phone (PWA)

1. Open the deployed URL in **Chrome** (Android) or **Safari** (iOS)
2. **Android**: Tap the three-dot menu → "Install app" or "Add to Home Screen"
3. **iOS**: Tap the Share button → "Add to Home Screen"
4. The app icon appears on your home screen — works fully offline!

---

## Environment Notes

| Feature | Requirement |
|---------|------------|
| PWA Offline | Service Worker (auto in production build) |
| FFmpeg.wasm | COOP/COEP headers (configured in dev & hosting) |
| Persistent Storage | `navigator.storage.persist()` (auto-called) |
| Thermal Printing | RawBT app on Android |

---

## Project Structure

```
src/
├── __tests__/          # Unit tests
├── components/
│   ├── billing/        # Invoice components (A4, Thermal, PrintHandler)
│   ├── layout/         # Sidebar, Header, MobileNav
│   └── ui/             # Toast, shared UI
├── db/
│   └── dexie.ts        # Database schema & persistence
├── pages/              # All route pages
├── store/
│   └── store.ts        # Zustand state management
├── utils/
│   └── share.ts        # WhatsApp sharing utilities
├── workers/
│   └── ffmpeg.worker.ts # FFmpeg Web Worker
├── App.tsx             # Root layout + routing
├── main.tsx            # Entry point
└── index.css           # Global styles + Tailwind
```
