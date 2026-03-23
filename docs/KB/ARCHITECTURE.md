# VisualInventory Architecture Documentation

## Database Schema

```mermaid
erDiagram
    firms ||--o{ verticals : "has"
    firms ||--o{ brands : "has"
    firms ||--o{ items : "owns"
    firms ||--o{ prospects : "has"
    firms ||--o{ orders : "creates"
    firms ||--o{ storage_places : "has"
    firms ||--o{ firm_users : "has"
    
    verticals ||--o{ brands : "contains"
    verticals ||--o{ items : "categorizes"
    verticals ||--o{ subcategories : "has"
    
    brands ||--o{ items : "manufactures"
    
    items ||--o{ order_items : "included in"
    items ||--o{ item_locations : "stored in"
    items ||--o{ stock_movements : "tracked by"
    
    prospects ||--o{ orders : "places"
    prospects ||--o{ visits : "visited"
    
    orders ||--o{ order_items : "contains"
    orders ||--o{ bills : "generates"
    
    storage_places ||--o{ storage_zones : "divided into"
    storage_zones ||--o{ storage_slots : "contains"
    storage_slots ||--o{ item_locations : "holds"
    
    suppliers ||--o{ purchase_orders : "supplies"
    purchase_orders ||--o{ purchase_order_items : "contains"

    firms {
        uuid id PK
        string name
        string slug
        string address
        string gstin
        jsonb enabled_features
    }
    
    items {
        bigint id PK
        uuid firm_id FK
        string item_name
        string keyword_id
        bigint vertical_id FK
        bigint brand_id FK
        int stock_parcels
        numeric retail_price_unit
        numeric wholesale_price_unit
    }
    
    orders {
        bigint id PK
        uuid firm_id FK
        bigint prospect_id FK
        string status
        numeric grand_total
        timestamp order_date
    }
    
    firm_users {
        uuid id PK
        uuid user_id FK
        uuid firm_id FK
        string role
    }
```

## Folder Structure

```mermaid
graph TD
    Root[VisualInventory] --> Src[src/]
    Root --> Docs[docs/]
    Root --> Public[public/]
    Root --> Scripts[scripts/]
    
    Src --> Components[components/]
    Src --> Pages[pages/]
    Src --> DB[db/]
    Src --> Store[store/]
    Src --> Hooks[hooks/]
    Src --> Config[config/]
    Src --> Auth[auth/]
    
    Components --> Billing[billing/]
    Components --> Warehouse[warehouse/]
    Components --> Layout[layout/]
    Components --> UI[ui/]
    
    DB --> DAL[dal.ts]
    DB --> Supabase[supabase.ts]
    DB --> Types[types.ts]
    
    Config --> FirmConfig[firmConfig.ts]
    Config --> FeaturesConfig[featuresConfig.ts]
    
    Auth --> AuthProvider[AuthProvider.tsx]
    Auth --> Types[types.ts]
    
    Docs --> Context[context/]
    Docs --> Tasks[tasks/]
    Docs --> SeedSQL[seed.sql]
```

## Firm-Based Auth Flow (Subdomain)

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant AuthProvider
    participant Supabase
    participant Store
    
    User->>Browser: Access app.kailash.observer
    Browser->>AuthProvider: Check session
    AuthProvider->>AuthProvider: No session found
    AuthProvider->>User: Show login page
    
    User->>AuthProvider: Enter credentials
    AuthProvider->>Supabase: Validate login
    Supabase-->>AuthProvider: Return user + firm_users
    
    alt Master Admin
        AuthProvider->>Store: Set role=master_admin
        AuthProvider->>Store: Set firmId=master
        AuthProvider->>AuthProvider: Fetch all firms
        AuthProvider->>User: Show firm switcher
    else Store Admin
        AuthProvider->>Store: Set role=store_admin
        AuthProvider->>Store: Set firmId from firm_users
        AuthProvider->>User: Redirect to /billing
    else Staff
        AuthProvider->>Store: Set role=staff
        AuthProvider->>Store: Set limited features
        AuthProvider->>User: Redirect to /billing
    end
```

## Feature Flag System

```mermaid
flowchart TD
    A[User Login] --> B{Check Role}
    
    B -->|master_admin| C[All Features Enabled]
    B -->|store_admin| D[Load firm.enabled_features]
    B -->|staff| E[Load STAFF_ALLOWED_FEATURES]
    
    C --> F[Show All Nav Items]
    D --> G[Filter Nav by enabled_features]
    E --> H[Show Only Billing/Inventory/Suppliers]
    
    G --> I{Route Access?}
    I -->|Feature Enabled| J[Allow Access]
    I -->|Feature Disabled| K[Redirect to /billing]
```

## SKU/Keyword Logic

```mermaid
flowchart LR
    A[Item Created] --> B[Generate keyword_id]
    B --> C[Format: VV-BBB-IIII]
    
    C --> D[VV = Vertical ID 2 digits]
    C --> E[BBB = Brand ID 3 digits]
    C --> F[IIII = Item ID 4 digits]
    
    D --> G[Example: 01-003-0042]
    G --> H[Vertical 01: Stationery]
    G --> I[Brand 003: Nataraj]
    G --> J[Item 0042: Ball Pen Blue]
    
    H --> K[Search by keyword_id]
    I --> K
    J --> K
    
    K --> L[Barcode Scanner Compatible]
```

## Data Isolation (Firm Scope)

```mermaid
flowchart TD
    A[API Request] --> B{Table in FIRM_SCOPED_TABLES?}
    
    B -->|Yes| C[Add firm_id filter]
    B -->|No| D[Return all records]
    
    C --> E[SELECT * FROM table WHERE firm_id = current_firm_id]
    D --> F[SELECT * FROM table]
    
    E --> G[Firm Isolated Data]
    F --> H[Global Shared Data]
    
    subgraph "Firm Scoped Tables"
        I[items, orders, prospects]
        J[verticals, brands, bills]
        K[storage_places, stock_movements]
    end
    
    subgraph "Global Tables"
        L[suppliers]
        M[variant_params_1/2/3]
    end
```

---

## Quick Reference

### Firm UUIDs
| Firm | UUID | Subdomain |
|------|------|-----------|
| Master HQ | `11111111-1111-1111-1111-111111111111` | `app.kailash.observer` |
| R.S. Enterprises | `33b0fa7a-217c-4c85-982e-e5301906bda7` | `rs.kailash.observer` |
| Kailash Fataka | `a41012cc-d643-41ea-a0f4-7bb5c1f08a51` | `kailash.kailash.observer` |
| Kartik Traders | `be17178e-4f92-4392-83de-1bfccdae1ff3` | `kartik.kailash.observer` |

### Default Credentials
| Username | Password | Role | Firm Access |
|----------|----------|------|-------------|
| admin | visualos2024 | master_admin | All firms |
| rs_admin | rs2024 | store_admin | R.S. Enterprises |
| kailash_admin | kailash2024 | store_admin | Kailash Fataka |
| kartik_admin | kartik2024 | store_admin | Kartik Traders |
| staff | staff2024 | staff | R.S. Enterprises |

### Role Permissions
| Feature | master_admin | store_admin | staff |
|---------|-------------|-------------|-------|
| Admin Panel | ✅ | ❌ | ❌ |
| All Firms | ✅ | ❌ | ❌ |
| Feature Toggle | ✅ | ❌ | ❌ |
| Analytics | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ❌ |
| Billing | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ✅ |
| Suppliers | ✅ | ✅ | ✅ |
| Warehouse | ✅ | ✅ | ✅ |
