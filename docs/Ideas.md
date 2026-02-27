# 💡 VisualOS — Concept & Ideas Dump

> [!TIP]  
> This document tracks high-level architectural ideas, feature dreams, and AI pipeline strategies for the future of VisualOS.

---

## 📸 Media Storage & Compression

**Concept:** Never store base64 image strings in the PostgreSQL database.
- **Workflow:** When a user takes a photo for an item, use `browser-image-compression` to shrink a 5MB photo to a 200KB WebP on the fly.
- **Storage:** Use Supabase Storage (S3-compatible) to store the WebP, and only save the string URL to the `items` table.
- **Offline Fallback:** If offline, cache the WebP blobs in OPFS until network returns.

---

## 📈 3D Analytical Math Processing

**The Problem:** Calculating multi-dimensional nested treemaps (Vertical $\rightarrow$ Brand $\rightarrow$ Item) for 10k items using JavaScript arrays (`.reduce`, `.map`) will freeze the browser tab.

**The Solution:**
1. Offload aggregation to the Database: 
   ```sql
   SELECT category, SUM(cost) as total, COUNT(*) as volume 
   FROM inventory 
   GROUP BY category
   ```
2. Feed the aggregated SQL views directly into `d3-hierarchy` to calculate the spatial bounding boxes.
3. Pass those flat bounds to an `@react-three/fiber` `<InstancedMesh>` to render 1,000s of colored heat tiles at 60FPS.

---

## 📱 Selective Rendering (Hybrid UI)

VisualOS is a heavy web application. We must gracefully degrade on mobile.

```tsx
if (isMobileDevice) {
    return <MobileListDashboard />
} else {
    // Render the heavy WebGL / 3D Voxel Engine
    return <ThreeJSWarehouseSim />
}
```

---

## 🤖 AI Model Pipeline Strategy

To continue building these complex features rapidly, we divide the labor among AI models based on their core competencies:

| Task | Recommended Model | Why |
|---|---|---|
| **UI Design & Voxel Aesthetics** | Gemini 2.5 Pro | Immense multimodal spatial reasoning. Can "see" a 3D scene mockup. |
| **Logic & R3F Shaders** | Claude 3.7 Sonnet | Unmatched at complex, multi-file React/WebGL algorithm chains. |
| **Database Schema & RLS** | Gemini 2.5 Pro | Excellent at PostgreSQL isolation and table mapping. |
| **Python Asset Scripts (Blender)** | Gemini 2.5 Pro | Superior library recall for `build123d` and CAD exports. |
| **TypeScript Bug Squashing** | Claude 3.7 Sonnet | Precise and logical bug detection in type-heavy files. |

> [!NOTE]  
> The Voxel Warehouse concept has massive SaaS potential. Before publishing source code, evaluate patenting the visual UI paradigm as an offline-capable WMS replacement.