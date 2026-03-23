# Firm-Based App Architecture

## Overview

Single codebase, multiple firm instances via subdomain routing.

---

## System Flow (Vertical)

```mermaid
flowchart TB
    subgraph User
        U[User visits URL]
    end
    
    subgraph DNS["Cloudflare DNS"]
        CF1[app.kailash.observer]
        CF2[rs.kailash.observer]
        CF3[kailash.kailash.observer]
        CF4[kartik.kailash.observer]
    end
    
    subgraph Hosting["Netlify Hosting"]
        N[Single Site]
        BUILD[Build from Git]
        DEPLOY[Deploy to CDN]
    end
    
    subgraph App["React App"]
        ROUTER[URL Router]
        CONFIG[firmConfig.ts]
        AUTH[AuthProvider]
        STORE[Zustand Store]
        DAL[Data Access Layer]
    end
    
    subgraph DB["Supabase DB"]
        FIRMS[firms table]
        DATA[Firm-scoped data]
    end
    
    U --> CF1 & CF2 & CF3 & CF4
    CF1 & CF2 & CF3 & CF4 --> N
    N --> ROUTER
    ROUTER --> CONFIG
    CONFIG --> AUTH
    AUTH --> STORE
    STORE --> DAL
    DAL --> FIRMS & DATA
```

---

## URL → Firm Resolution

```mermaid
flowchart TD
    START[Browser URL] --> PARSE[Parse hostname]
    PARSE --> CHECK{In FIRM_MAP?}
    
    CHECK -->|Yes| MATCH[Return FirmConfig]
    CHECK -->|No| DEFAULT[Return DEFAULT_FIRM]
    
    MATCH --> SET[Set firmId + role in store]
    DEFAULT --> SET
    
    SET --> FETCH[Fetch firms from DB]
    FETCH --> FEATURES[Load enabled_features]
    FEATURES --> READY[App Ready]
```

---

## Role-Based Access

```mermaid
flowchart TD
    LOGIN[User Login] --> ROLE{Check Role}
    
    ROLE -->|master_admin| M1[All Features]
    ROLE -->|master_admin| M2[All Firms Access]
    ROLE -->|master_admin| M3[Admin Panel Visible]
    
    ROLE -->|store_admin| S1[Firm Features Only]
    ROLE -->|store_admin| S2[Own Firm Only]
    ROLE -->|store_admin| S3[No Admin Panel]
    
    ROLE -->|staff| T1[Limited Features]
    ROLE -->|staff| T2[Own Firm Only]
    ROLE -->|staff| T3[No Analytics/Reports]
    
    M1 & M2 & M3 --> SHOW[Show UI]
    S1 & S2 & S3 --> SHOW
    T1 & T2 & T3 --> SHOW
```

---

## Data Isolation

```mermaid
flowchart TD
    REQUEST[DB Request] --> TABLE{Table Type?}
    
    TABLE -->|Firm Scoped| FILTER[Add firm_id filter]
    TABLE -->|Global| ALL[Return all]
    
    FILTER --> QUERY[SELECT * WHERE firm_id = X]
    ALL --> QUERY2[SELECT *]
    
    subgraph Scoped["Firm-Scoped Tables"]
        S1[items]
        S2[orders]
        S3[prospects]
        S4[verticals]
        S5[brands]
    end
    
    subgraph Global["Global Tables"]
        G1[suppliers]
        G2[variant_params]
    end
```

---

## Firm Configuration

| Subdomain | Firm | UUID | Role |
|-----------|------|------|------|
| `app.kailash.observer` | Master HQ | `11111111-...` | master_admin |
| `rs.kailash.observer` | R.S. Enterprises | `33b0fa7a-...` | store_owner |
| `kailash.kailash.observer` | Kailash Fataka | `a41012cc-...` | store_owner |
| `kartik.kailash.observer` | Kartik Traders | `be17178e-...` | store_owner |

---

## Feature Matrix

| Feature | master_admin | store_admin | staff |
|---------|:------------:|:-----------:|:-----:|
| Admin Panel | ✅ | ❌ | ❌ |
| Firm Switcher | ✅ | ❌ | ❌ |
| Feature Toggle | ✅ | ❌ | ❌ |
| Analytics | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ❌ |
| Accounting | ✅ | ✅ | ❌ |
| Billing | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ✅ |
| Suppliers | ✅ | ✅ | ✅ |
| Warehouse | ✅ | ✅ | ✅ |
| Field Ops | ✅ | ✅ | ❌ |
| Marketing | ✅ | ✅ | ❌ |
| Media | ✅ | ✅ | ❌ |

---

## Cloudflare DNS Setup

```
Type: CNAME
Name: app
Target: your-site.netlify.app
Proxy: ✅ Enabled

Type: CNAME  
Name: rs
Target: your-site.netlify.app
Proxy: ✅ Enabled

Type: CNAME
Name: kailash
Target: your-site.netlify.app
Proxy: ✅ Enabled

Type: CNAME
Name: kartik
Target: your-site.netlify.app
Proxy: ✅ Enabled
```

---

## Netlify Settings

```
Build Command: npm run build
Publish Directory: dist

# All subdomains point to same site
# App resolves firm from hostname
```

---

## Code Flow

```
App.tsx
  └── resolveFirmFromURL()     # Get firm from hostname
  └── AuthProvider             # Handle login/session
      └── LoginPage            # If not logged in
      └── FirmSwitcher         # If master_admin
      └── Routes
          └── FeatureRoute     # Check feature access
              └── Pages        # Render if allowed
```

---

## Quick Reference

### Default Credentials
| Username | Password | Role |
|----------|----------|------|
| admin | visualos2024 | master_admin |
| rs_admin | rs2024 | store_admin |
| kailash_admin | kailash2024 | store_admin |
| kartik_admin | kartik2024 | store_admin |
| staff | staff2024 | staff |

### Key Files
| File | Purpose |
|------|---------|
| `src/config/firmConfig.ts` | Subdomain → firm mapping |
| `src/config/featuresConfig.ts` | Feature definitions |
| `src/auth/AuthProvider.tsx` | Login/session handling |
| `src/hooks/useFeatureFlag.ts` | Feature access check |
| `src/db/dal.ts` | Firm-scoped DB queries |
