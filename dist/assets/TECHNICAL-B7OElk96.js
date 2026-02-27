const e=`# ⚙️ VisualOS — Technical Architecture\r
\r
> [!IMPORTANT]  \r
> VisualOS is built on a modern **Vite + React 18 + Supabase** stack. It leverages cutting-edge browser technologies (WebGL, Web Workers) while maintaining a strict, secure relational database backend.\r
\r
---\r
\r
## 🧱 Technology Stack\r
\r
| Domain | Technology | Purpose |\r
|-------|-----------|---------|\r
| **Core** | \`React 18\` + \`TypeScript\` | Strongly typed UI logic |\r
| **Build** | \`Vite\` | Lightning fast HMR & optimized bundling |\r
| **Backend** | \`Supabase\` (PostgreSQL) | Auth, Database, and Realtime sync |\r
| **State** | \`Zustand\` | Atomic, cross-component UI/Cart state |\r
| **Graphics** | \`Three.js\` + \`@react-three/fiber\` | Voxel warehouse and analytical treemaps |\r
| **Math** | \`d3-hierarchy\` | Calculating spatial bounds for heatmaps |\r
| **PDF** | \`jspdf\` | Client-side catalog and invoice generation |\r
\r
---\r
\r
## 🗄️ Database Architecture (PostgreSQL)\r
\r
The entire application relies on Supabase **Row Level Security (RLS)**. Every table has a \`firm_id\` column ensuring strict multi-tenant boundaries.\r
\r
\`\`\`mermaid\r
erDiagram\r
    FIRMS ||--o{ FIRM_USERS : "employs"\r
    FIRMS ||--o{ ITEMS : "owns"\r
    FIRMS ||--o{ ORDERS : "processes"\r
    FIRMS ||--o{ WAREHOUSE_LAYOUT : "structures"\r
    \r
    ORDERS ||--o{ ORDER_ITEMS : "contains"\r
    ITEMS ||--o{ ORDER_ITEMS : "sold as"\r
    \r
    WAREHOUSE_LAYOUT ||--o{ WAREHOUSE_CELLS : "divided into"\r
    ITEMS ||--o| WAREHOUSE_CELLS : "stored in"\r
\r
    ITEMS {\r
        uuid firm_id FK\r
        text item_name\r
        int stock_parcels\r
        float retail_price_unit\r
    }\r
\r
    ORDERS {\r
        uuid firm_id FK\r
        text status\r
        float grand_total\r
    }\r
\`\`\`\r
\r
---\r
\r
## 🏎️ State & Rendering Pipeline\r
\r
To handle thousands of inventory items without browser lag, VisualOS avoids heavy generic table libraries. \r
\r
\`\`\`mermaid\r
graph TD\r
    A[Supabase Network Request] -->|DAL Fetch| B(React Component Mounts)\r
    B -->|Caches| C{Zustand Store}\r
    C -->|Subscribes| D[UI Components]\r
    \r
    E[User Clicks Analytics] -->|Loads 10k Items| F[D3 Hierarchy Engine]\r
    F -->|Calculates Math Bounds array| G[React Three Fiber Canvas]\r
    G -->|<instancedMesh> render| H[Browser GPU]\r
\`\`\`\r
\r
### 🧠 Core Design Tenets\r
1. **Client-Side Heavy, Server-Side Dumb:** Supabase acts exclusively as a secure data-store. All PDF generation, CSV parsing, math aggregations, and visual calculations happen on the user's local CPU/GPU saving massive server costs.\r
2. **Immutable React State:** Zustand is used to prevent prop-drilling, but database data is fetched fresh via the DAL to ensure the PWA doesn't desync from truth.\r
3. **React 18 Strict Compatibility:** 3rd party rendering libraries (like \`@react-three/drei\`) are strictly version-locked to guarantee Reconciler stability.\r
`;export{e as default};
