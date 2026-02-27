const n=`# 🚀 VisualOS — Deployment Guide\r
\r
> [!IMPORTANT]  \r
> VisualOS is a modern React SPA powered by a **Supabase** backend. To deploy this application, you must configure both the frontend host (like Netlify or Vercel) and the backend database.\r
\r
---\r
\r
## 🏗️ Step 1: Backend Deployment (Supabase)\r
\r
1. Create a new project at [Supabase.com](https://supabase.com/).\r
2. Navigate to the **SQL Editor**.\r
3. Copy the contents of \`docs/supabase_schema.sql\` and run it. This script automatically:\r
   - Creates all tables (\`firms\`, \`items\`, \`orders\`, etc.)\r
   - Enables **Row Level Security (RLS)** for multi-tenant data isolation.\r
   - Creates the necessary triggers for inventory management.\r
4. Go to **Project Settings → API** and copy your \`Project URL\` and \`anon public key\`.\r
\r
---\r
\r
## 🌐 Step 2: Frontend Deployment (Netlify)\r
\r
> [!TIP]  \r
> Netlify is recommended as it provides free automatic HTTPS, unmetered edge caching, and seamless continuous integration from GitHub.\r
\r
1. **Push your code to GitHub/GitLab**\r
   \`\`\`bash\r
   git add .\r
   git commit -m "Ready for production"\r
   git push -u origin main\r
   \`\`\`\r
\r
2. **Connect to Netlify**\r
   - Go to [netlify.com](https://app.netlify.com/signup)\r
   - Click **"Add new site" → "Import an existing project"**\r
   - Select your repository.\r
\r
3. **Configure Build Settings**\r
   - **Build command:** \`npm run build\`\r
   - **Publish directory:** \`dist\`\r
\r
### 🔒 Step 3: Environment Variables\r
Before clicking deploy, you **MUST** add your Supabase credentials to Netlify's environment variables:\r
\r
| Key | Value |\r
|-----|-------|\r
| \`VITE_SUPABASE_URL\` | \`https://your-project.supabase.co\` |\r
| \`VITE_SUPABASE_ANON_KEY\` | \`your-anon-key-string\` |\r
\r
4. **Click Deploy** — Netlify will build the app and provide a live URL!\r
\r
---\r
\r
## 🛠️ Troubleshooting\r
\r
| Issue | Solution |\r
|-------|---------|\r
| **Blank Screen / 404** | The \`netlify.toml\` handles SPA routing. Ensure it exists in the root directory. |\r
| **Network Errors on Login** | Your Supabase environment variables are missing or incorrect in Netlify settings. |\r
| **Missing Icons/Styles** | Ensure your \`vite.config.ts\` has the correct \`base\` path if not deployed to a root domain. |\r
`;export{n as default};
