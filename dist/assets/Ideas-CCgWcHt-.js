const e=`# 💡 VisualOS — Concept & Ideas Dump\r
\r
> [!TIP]  \r
> This document tracks high-level architectural ideas, feature dreams, and AI pipeline strategies for the future of VisualOS.\r
\r
---\r
\r
## 📸 Media Storage & Compression\r
\r
**Concept:** Never store base64 image strings in the PostgreSQL database.\r
- **Workflow:** When a user takes a photo for an item, use \`browser-image-compression\` to shrink a 5MB photo to a 200KB WebP on the fly.\r
- **Storage:** Use Supabase Storage (S3-compatible) to store the WebP, and only save the string URL to the \`items\` table.\r
- **Offline Fallback:** If offline, cache the WebP blobs in OPFS until network returns.\r
\r
---\r
\r
## 📈 3D Analytical Math Processing\r
\r
**The Problem:** Calculating multi-dimensional nested treemaps (Vertical $\\rightarrow$ Brand $\\rightarrow$ Item) for 10k items using JavaScript arrays (\`.reduce\`, \`.map\`) will freeze the browser tab.\r
\r
**The Solution:**\r
1. Offload aggregation to the Database: \r
   \`\`\`sql\r
   SELECT category, SUM(cost) as total, COUNT(*) as volume \r
   FROM inventory \r
   GROUP BY category\r
   \`\`\`\r
2. Feed the aggregated SQL views directly into \`d3-hierarchy\` to calculate the spatial bounding boxes.\r
3. Pass those flat bounds to an \`@react-three/fiber\` \`<InstancedMesh>\` to render 1,000s of colored heat tiles at 60FPS.\r
\r
---\r
\r
## 📱 Selective Rendering (Hybrid UI)\r
\r
VisualOS is a heavy web application. We must gracefully degrade on mobile.\r
\r
\`\`\`tsx\r
if (isMobileDevice) {\r
    return <MobileListDashboard />\r
} else {\r
    // Render the heavy WebGL / 3D Voxel Engine\r
    return <ThreeJSWarehouseSim />\r
}\r
\`\`\`\r
\r
---\r
\r
## 🤖 AI Model Pipeline Strategy\r
\r
To continue building these complex features rapidly, we divide the labor among AI models based on their core competencies:\r
\r
| Task | Recommended Model | Why |\r
|---|---|---|\r
| **UI Design & Voxel Aesthetics** | Gemini 2.5 Pro | Immense multimodal spatial reasoning. Can "see" a 3D scene mockup. |\r
| **Logic & R3F Shaders** | Claude 3.7 Sonnet | Unmatched at complex, multi-file React/WebGL algorithm chains. |\r
| **Database Schema & RLS** | Gemini 2.5 Pro | Excellent at PostgreSQL isolation and table mapping. |\r
| **Python Asset Scripts (Blender)** | Gemini 2.5 Pro | Superior library recall for \`build123d\` and CAD exports. |\r
| **TypeScript Bug Squashing** | Claude 3.7 Sonnet | Precise and logical bug detection in type-heavy files. |\r
\r
> [!NOTE]  \r
> The Voxel Warehouse concept has massive SaaS potential. Before publishing source code, evaluate patenting the visual UI paradigm as an offline-capable WMS replacement.`;export{e as default};
