const e=`# 🎯 VisualOS — Functional Specification\r
\r
> [!NOTE]  \r
> VisualOS is a multi-tenant, cloud-synced SaaS application designed for wholesale and retail inventory management, CRM, and spatial warehouse logistics.\r
\r
---\r
\r
## 🗺️ Navigation & Modules\r
\r
| Module | Core Purpose |\r
|------|---------|\r
| **Dashboard** | At-a-glance KPIs — item count, dynamic low stock alerts, recent transactions. |\r
| **Inventory** | Master SKU matrix. Manage items across multiple hierarchical layers (Vertical → Brand → Product). |\r
| **Billing (POS)** | Point of Sale interface. Switch between \`Bulk\` (Wholesale) and \`Lean\` (Retail) pricing instantly. |\r
| **Warehouse (Voxel)** | spatial 2D/3D representation of physical racks, bins, and parcels for visual picking/packing. |\r
| **Analytics (Treemap)** | Hierarchical WebGL treemaps depicting nested revenue and cost geometry visually. |\r
| **Prospects CRM** | Client directory mapped to geographical areas and business types. |\r
| **Price Lists** | Generate heavily branded, tabular PDF catalogs directly in the browser. |\r
\r
---\r
\r
## ✨ Core Feature Nuances\r
\r
### 📦 1. 3-Tier Volumetric Stock\r
VisualOS abandons simple "quantity" integers for a realistic volumetric model:\r
1. **P_unit:** The atomic unit (e.g., 1 Pencil).\r
2. **P_unit_per_parcel:** The box scale (e.g., 50 Pencils per Box).\r
3. **Stock Parcels:** Physical boxes in the warehouse.\r
\r
*When a sale is made, the engine calculates the atomic deduction and correctly reduces physical parcel counts.*\r
\r
### 🏢 2. Multi-Tenant Firm Isolation\r
Unlike single-database apps, VisualOS is designed for Franchises. \r
- A single user account can access **Firm A (Master)** and **Firm B (Retail Branch)**.\r
- Supabase **Row Level Security (RLS)** guarantees that when logged into Firm B, it is mathematically impossible to query Firm A's inventory or sales data.\r
\r
### 🎨 3. Fallback Rendering (WebGL → DOM)\r
High-end desktop users get beautiful \`@react-three/fiber\` 3D visualizations for Analytics and Warehouse management. If accessed on a low-end mobile device, the system gracefully degrades to CSS-Grid or DOM-based lists to preserve battery and maintain 60FPS.\r
\r
---\r
\r
## 💳 Billing Lifecycle\r
\r
\`\`\`mermaid\r
stateDiagram-v2\r
    [*] --> Cart_Building\r
    Cart_Building --> Checkout\r
    Checkout --> Pending_Payment\r
    Pending_Payment --> Dispatched : Full Payment Received\r
    Pending_Payment --> Partial_Due : Partial Payment\r
    Dispatched --> [*]\r
\`\`\`\r
- **Cart Building:** Sales reps scan or search items, adjusting quantities.\r
- **Dynamic Pricing:** Prices auto-shift based on the prospect's tier (Retail vs Wholesale).\r
- **Dispatch:** Only when an order hits the \`dispatched\` state does the strict stock mutation trigger.\r
`;export{e as default};
