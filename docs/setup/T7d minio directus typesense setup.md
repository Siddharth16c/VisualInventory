1. How Docker Compose Works Think of Docker as a tool that creates a lightweight, portable "virtual computer" (called a container) that holds only the software you need. 
Docker Compose is a manager for these containers. For Directus, you typically need three different pieces of software running at the same time: 

1. Directus itself (the App) 
2. A Database (like PostgreSQL or MySQL to store your data) 
3. A Cache (like Redis, optional but recommended for speed) 

Instead of starting each of these manually with long commands, you create a single file called docker-compose.yml. This file acts as a recipe that tells Docker: 

• "Start a Postgres database." 
• "Start Directus and connect it to that database." 
• "Make sure they can talk to each other." 
 
• Oracle Cloud Always Free: Generous free tier that gives you a powerful enough VPS to run Directus + Docker Compose 24/7 for free (requires more technical setup).



Your physical stack idea is solid — fanless mini-PCs (like an N100 Intel board) at ₹8,000-12,000 draw 6-10W, have no moving parts, run 24/7 on a UPS, and outperform any cloud free tier for personal infra. This is exactly what self-hosters use: mini-PC + external SSD + UPS + Cloudflare Tunnel = personal cloud at ~₹150/month electricity, owned forever.



_____________________________________________________________________________________________-
**Self-hosting options (free/low-cost):**
Fly.io gives 3 free VMs with persistent volumes — best for Directus + MinIO together. Oracle Cloud Free Tier gives 2 AMD VMs + 200GB storage permanently free — best raw deal for always-on hosting. Railway and Render both sleep on free tier, making them unsuitable for Directus. **Oracle Free Tier is the winner** — run Directus + MinIO on it, zero cost, no sleep, 200GB covers large media catalogs.

**Local laptop as server — cost vs cloud:**
A laptop on 24/7 draws ~15-30W vs a desktop's 80-150W — roughly ₹300-600/month electricity at Indian rates. You get full control, no egress fees, and MinIO on local SSD is extremely fast. Downside: needs static IP or ngrok/Cloudflare Tunnel, dies if power cuts, requires maintenance. Supabase Storage free tier gives 1GB, then ~$0.021/GB — cheap but adds up for flipbook/video media. **Verdict: old laptop on Oracle-style always-on Linux beats paying cloud storage for media at scale**, especially paired with Cloudflare Tunnel for zero port-forwarding hassle.

**Your physical stack idea is solid** — fanless mini-PCs (like an N100 Intel board) at ₹8,000-12,000 draw 6-10W, have no moving parts, run 24/7 on a UPS, and outperform any cloud free tier for personal infra. This is exactly what self-hosters use: mini-PC + external SSD + UPS + Cloudflare Tunnel = personal cloud at ~₹150/month electricity, owned forever.

**Recommended stack for you:** Oracle Free Tier VM for Directus, old laptop or N100 mini-PC for MinIO media storage tunneled via Cloudflare, Supabase stays for relational data + auth.

________________________________________________________________________

# Oracle Cloud Free Tier + MinIO + Directus + Typesense Setup
## For VisualInventory Project — Agent-Readable Setup Guide
**Target executor:** Kimi K2.5 OpenCode (or any coding assistant)  
**DB:** Supabase (existing, unchanged)  
**Goal:** Free permanent hosting for Directus (admin UI) + MinIO (media storage) + Typesense (search cache)

---

## SECTION 0 — Architecture Overview

```
[React App on Netlify]
        │
        ├──► Supabase (Postgres — relational data, auth, RLS)
        ├──► MinIO on Oracle VM (product images, PDFs, flipbooks)
        ├──► Directus on Oracle VM (bulk SKU entry UI for staff)
        └──► Typesense on Oracle VM (search index cache)

[Your Phone]
        └──► SSH via Termius app → Oracle VM (manage everything remotely)

[Oracle Free Tier VM]
        └── Ubuntu 22.04 ARM
            ├── Docker + Docker Compose
            ├── MinIO (port 9000/9001)
            ├── Directus (port 8055)
            ├── Typesense (port 8108)
            └── Caddy (reverse proxy + automatic HTTPS)
```

**Why Oracle Free Tier:**
- 4 ARM cores + 24GB RAM (Ampere A1) — permanently free
- 200GB block storage — permanently free
- No sleep, no credit card charges after signup
- Better specs than any paid hobby tier on Railway/Render

---

## SECTION 1 — Oracle Cloud Account + VM Setup

### 1.1 Create Oracle Cloud Account

1. Go to https://cloud.oracle.com/
2. Click **Start for free**
3. Fill in details — use a real phone number (OTP required)
4. **Credit card is required for verification** but will NOT be charged for Always Free resources
5. Select **Home Region** — choose the closest: `ap-mumbai-1` (Mumbai) for India
   - CRITICAL: Home region cannot be changed after signup
6. Wait for account activation email (can take 10-30 minutes)

### 1.2 Create the VM Instance

1. Login → **Compute** → **Instances** → **Create Instance**

2. **Name:** `visualinventory-server`

3. **Image:** Click "Change Image"
   - Select **Canonical Ubuntu**
   - Version: **22.04 LTS**
   - Shape: **Ampere** (ARM) — this is the free one

4. **Shape:** Click "Change Shape"
   - Select **VM.Standard.A1.Flex**
   - OCPUs: **4** (max free)
   - Memory: **24 GB** (max free)

5. **Networking:**
   - Create new VCN or use existing
   - **Assign a public IPv4 address: YES** (important)

6. **SSH Keys:**
   - If you have an SSH key: paste your public key
   - If not: click **Download Private Key** — save this file, you need it to login
   - Save as `oracle-visualinventory.key`

7. Click **Create**

8. Wait ~2 minutes for status to show **Running**

9. Note the **Public IP address** — you'll use this everywhere

### 1.3 Open Firewall Ports (Security List)

Oracle blocks all ports by default. Open these:

1. Go to **Networking** → **Virtual Cloud Networks** → your VCN
2. Click **Security Lists** → **Default Security List**
3. Click **Add Ingress Rules** — add each of these:

| Source CIDR | Protocol | Port | Purpose |
|-------------|----------|------|---------|
| 0.0.0.0/0 | TCP | 22 | SSH |
| 0.0.0.0/0 | TCP | 80 | HTTP (Caddy redirect) |
| 0.0.0.0/0 | TCP | 443 | HTTPS |
| 0.0.0.0/0 | TCP | 9001 | MinIO Console (temporary, close later) |

4. Click **Add Ingress Rules**

### 1.4 Also open ports in Ubuntu firewall (iptables)

SSH into the VM first (see Section 2), then run:

```bash
# Ubuntu's iptables blocks ports even if Oracle security list allows them
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 9001 -j ACCEPT
sudo netfilter-persistent save
```

### 1.5 Add Block Storage Volume (200GB free)

1. **Storage** → **Block Volumes** → **Create Block Volume**
2. Name: `visualinventory-data`
3. Size: **200 GB**
4. Availability Domain: same as your VM
5. Click **Create Block Volume**

6. After creation: **Attached Block Volumes** → **Attach to Instance**
   - Select your VM
   - Access: **Read/Write**
   - Note the device path shown (e.g. `/dev/oracleoci/oraclevdb`)

7. SSH into VM and mount it:
```bash
# Format the volume (ONCE ONLY — this erases it)
sudo mkfs.ext4 /dev/sdb

# Create mount point
sudo mkdir -p /mnt/data

# Mount it
sudo mount /dev/sdb /mnt/data

# Make it mount automatically on reboot
echo '/dev/sdb /mnt/data ext4 defaults,_netdev,nofail 0 2' | sudo tee -a /etc/fstab

# Verify
df -h /mnt/data
# Should show ~196GB available
```

---

## SECTION 2 — SSH Access (Desktop + Phone)

### 2.1 SSH from Desktop/Laptop

```bash
# Fix key permissions (required on Linux/Mac)
chmod 400 oracle-visualinventory.key

# Connect
ssh -i oracle-visualinventory.key ubuntu@YOUR_ORACLE_PUBLIC_IP

# Save as alias for convenience — add to ~/.bashrc or ~/.zshrc:
alias oracle='ssh -i ~/keys/oracle-visualinventory.key ubuntu@YOUR_ORACLE_PUBLIC_IP'
```

### 2.2 SSH from Phone (Termius — iOS and Android)

1. Install **Termius** (free tier is sufficient)
   - iOS: https://apps.apple.com/app/termius/id549039908
   - Android: https://play.google.com/store/apps/details?id=com.server.auditor.ssh.client

2. Open Termius → **New Host**:
   - Hostname: `YOUR_ORACLE_PUBLIC_IP`
   - Username: `ubuntu`
   - Auth: Key
   - Import your `.key` file (transfer via AirDrop, Google Drive, or email to yourself)

3. Tap **Connect** — you now have a full terminal on your phone

**Alternative phone SSH apps:** JuiceSSH (Android, free), ShellFish (iOS)

### 2.3 Set up SSH config for convenience (desktop)

Create/edit `~/.ssh/config`:
```
Host oracle-vi
    HostName YOUR_ORACLE_PUBLIC_IP
    User ubuntu
    IdentityFile ~/keys/oracle-visualinventory.key
    ServerAliveInterval 60
```

Now connect with just: `ssh oracle-vi`

---

## SECTION 3 — Server Initial Setup

SSH into your VM, then run:

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install essentials
sudo apt-get install -y \
    curl wget git unzip \
    htop ncdu \
    netfilter-persistent iptables-persistent

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add ubuntu user to docker group (no sudo needed for docker)
sudo usermod -aG docker ubuntu

# Install Docker Compose plugin
sudo apt-get install -y docker-compose-plugin

# Logout and back in for group change to take effect
exit
# SSH back in
ssh oracle-vi

# Verify
docker --version
docker compose version

# Create project directory on the 200GB volume
mkdir -p /mnt/data/visualinventory
mkdir -p /mnt/data/visualinventory/minio
mkdir -p /mnt/data/visualinventory/directus/uploads
mkdir -p /mnt/data/visualinventory/directus/extensions
mkdir -p /mnt/data/visualinventory/typesense/data
mkdir -p /mnt/data/visualinventory/caddy/data
mkdir -p /mnt/data/visualinventory/caddy/config

# Create symlink for convenience
ln -s /mnt/data/visualinventory ~/vi-services
cd ~/vi-services
```

---

## SECTION 4 — DNS Setup (Required for HTTPS)

Before deploying services, point your domain/subdomains to the Oracle VM IP.

Add these DNS A records at your domain registrar (Cloudflare, GoDaddy, etc.):

| Subdomain | Type | Value |
|-----------|------|-------|
| `minio.yourdomain.com` | A | YOUR_ORACLE_PUBLIC_IP |
| `directus.yourdomain.com` | A | YOUR_ORACLE_PUBLIC_IP |
| `typesense.yourdomain.com` | A | YOUR_ORACLE_PUBLIC_IP |

If you don't have a domain yet, use **Cloudflare** (free):
1. Register any domain (~₹800/year for .com)
2. Add it to Cloudflare (free plan)
3. Add the A records above
4. Set proxy status to **DNS only** (grey cloud) — not proxied, for now

Wait 5-10 minutes for DNS to propagate before running Caddy.

---

## SECTION 5 — Environment File

```bash
cd ~/vi-services
nano .env
```

Paste and fill in:

```bash
# ── Domain ─────────────────────────────────────────────────────────
DOMAIN=yourdomain.com
MINIO_DOMAIN=minio.yourdomain.com
DIRECTUS_DOMAIN=directus.yourdomain.com
TYPESENSE_DOMAIN=typesense.yourdomain.com

# ── MinIO ───────────────────────────────────────────────────────────
MINIO_ROOT_USER=vi_admin
MINIO_ROOT_PASSWORD=generate_strong_password_here
MINIO_BUCKET=product-media

# ── Directus ────────────────────────────────────────────────────────
# Generate: openssl rand -base64 32
DIRECTUS_SECRET=paste_64_char_random_string_here
DIRECTUS_ADMIN_EMAIL=your@email.com
DIRECTUS_ADMIN_PASSWORD=generate_strong_password_here

# Your Supabase Postgres connection string
# Found in: Supabase Dashboard → Settings → Database → URI
# IMPORTANT: add ?sslmode=require at the end
DIRECTUS_DB_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres?sslmode=require

# ── Typesense ───────────────────────────────────────────────────────
# Generate: openssl rand -hex 32
TYPESENSE_API_KEY=generate_hex_key_here

# ── Caddy (email for Let's Encrypt certificates) ────────────────────
CADDY_EMAIL=your@email.com
```

Generate secrets:
```bash
openssl rand -base64 32   # for DIRECTUS_SECRET
openssl rand -hex 32      # for TYPESENSE_API_KEY
```


When Oracle VM is ready, you'll scp this file directly to the server:
bashscp -i oracle-visualinventory.key ~/visualinventory-setup/.env ubuntu@YOUR_ORACLE_IP:~/vi-services/.env
So nothing gets retyped — secrets generated once, stored locally, transferred directly.
---

## SECTION 6 — Docker Compose File

```bash
nano ~/vi-services/docker-compose.yml
```

```yaml
version: "3.8"

services:

  # ── Caddy: reverse proxy + automatic HTTPS ─────────────────────────
  caddy:
    image: caddy:2-alpine
    container_name: vi_caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - /mnt/data/visualinventory/caddy/data:/data
      - /mnt/data/visualinventory/caddy/config:/config
    depends_on:
      - directus
      - minio
      - typesense
    networks:
      - vi_net

  # ── MinIO: object storage for product media ─────────────────────────
  minio:
    image: minio/minio:latest
    container_name: vi_minio
    restart: unless-stopped
    ports:
      - "9000:9000"     # S3 API (internal — Caddy proxies 443 to this)
      - "9001:9001"     # Console (close this port after setup)
    volumes:
      - /mnt/data/visualinventory/minio:/data
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_BROWSER_REDIRECT_URL: https://${MINIO_DOMAIN}:9001
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - vi_net

  # ── MinIO init: creates bucket on first run ─────────────────────────
  minio-init:
    image: minio/mc:latest
    container_name: vi_minio_init
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
        mc alias set local http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD};
        mc mb --ignore-existing local/${MINIO_BUCKET};
        mc anonymous set download local/${MINIO_BUCKET};
        echo 'MinIO bucket ready';
      "
    environment:
      MINIO_BUCKET: ${MINIO_BUCKET}
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    networks:
      - vi_net

  # ── Directus: admin UI over Supabase Postgres ──────────────────────
  directus:
    image: directus/directus:latest
    container_name: vi_directus
    restart: unless-stopped
    ports:
      - "8055:8055"
    volumes:
      - /mnt/data/visualinventory/directus/uploads:/directus/uploads
      - /mnt/data/visualinventory/directus/extensions:/directus/extensions
    depends_on:
      minio:
        condition: service_healthy
    environment:
      SECRET: ${DIRECTUS_SECRET}
      PUBLIC_URL: https://${DIRECTUS_DOMAIN}

      # Connect to existing Supabase Postgres
      DB_CLIENT: pg
      DB_CONNECTION_STRING: ${DIRECTUS_DB_URL}

      # First-run admin account
      ADMIN_EMAIL: ${DIRECTUS_ADMIN_EMAIL}
      ADMIN_PASSWORD: ${DIRECTUS_ADMIN_PASSWORD}

      # Store uploads in MinIO
      STORAGE_LOCATIONS: minio
      STORAGE_MINIO_DRIVER: s3
      STORAGE_MINIO_ENDPOINT: http://minio:9000
      STORAGE_MINIO_KEY: ${MINIO_ROOT_USER}
      STORAGE_MINIO_SECRET: ${MINIO_ROOT_PASSWORD}
      STORAGE_MINIO_BUCKET: ${MINIO_BUCKET}
      STORAGE_MINIO_FORCE_PATH_STYLE: "true"
      STORAGE_MINIO_REGION: us-east-1

      # CORS for React app
      CORS_ENABLED: "true"
      CORS_ORIGIN: "https://yourdomain.netlify.app,http://localhost:5173"

      # Performance
      CACHE_ENABLED: "true"
      CACHE_STORE: memory
      CACHE_TTL: 5m

      # Disable telemetry
      TELEMETRY: "false"
    networks:
      - vi_net

  # ── Typesense: search index + cache ───────────────────────────────
  typesense:
    image: typesense/typesense:26.0
    container_name: vi_typesense
    restart: unless-stopped
    ports:
      - "8108:8108"
    volumes:
      - /mnt/data/visualinventory/typesense/data:/data
    command: >
      --data-dir /data
      --api-key=${TYPESENSE_API_KEY}
      --enable-cors
      --cors-domains=https://yourdomain.netlify.app,http://localhost:5173
    networks:
      - vi_net

networks:
  vi_net:
    driver: bridge
```

---

## SECTION 7 — Caddyfile (Reverse Proxy + Auto HTTPS)

```bash
nano ~/vi-services/Caddyfile
```

```
# Directus admin UI
directus.yourdomain.com {
    reverse_proxy vi_directus:8055
    encode gzip
}

# MinIO S3 API (for React app uploads)
minio.yourdomain.com {
    reverse_proxy vi_minio:9000
    encode gzip
    # Allow large uploads (product images, flipbooks)
    request_body {
        max_size 500MB
    }
}

# Typesense search API
typesense.yourdomain.com {
    reverse_proxy vi_typesense:8108
    encode gzip
}
```

Caddy automatically gets Let's Encrypt SSL certificates for all three domains.  
No certbot needed. No manual renewal needed.

---

## SECTION 8 — Deploy Everything

```bash
cd ~/vi-services

# Start all services
docker compose up -d

# Watch startup logs
docker compose logs -f

# Check status
docker compose ps
```

Expected after ~2 minutes:
```
NAME              STATUS          PORTS
vi_caddy          Up              0.0.0.0:80->80, 0.0.0.0:443->443
vi_minio          Up (healthy)    0.0.0.0:9000->9000, 0.0.0.0:9001->9001
vi_minio_init     Exited (0)      ← success
vi_directus       Up              0.0.0.0:8055->8055
vi_typesense      Up              0.0.0.0:8108->8108
```

### Verify each service:
```bash
# Directus
curl https://directus.yourdomain.com/server/health
# Expected: {"status":"ok"}

# MinIO
curl https://minio.yourdomain.com/minio/health/live
# Expected: 200 OK

# Typesense
curl -H "X-TYPESENSE-API-KEY: YOUR_API_KEY" https://typesense.yourdomain.com/health
# Expected: {"ok":true}
```

---

## SECTION 9 — Directus Configuration for VisualInventory

### 9.1 First Login
Open https://directus.yourdomain.com  
Login: `DIRECTUS_ADMIN_EMAIL` / `DIRECTUS_ADMIN_PASSWORD`

### 9.2 Enable Tables for Staff Access
Settings → Data Model → enable these tables:
- `items` — bulk SKU entry
- `brands`, `verticals`, `products`, `subcategories` — reference data
- `packing_units`, `variant_params_1`, `variant_params_2`, `variant_params_3`
- `prospects`, `suppliers`
- `storage_places`, `storage_zones`, `storage_slots`

**Do NOT enable:** `orders`, `order_items`, `bills`, `stock_movements`, `costs`, `account`

### 9.3 Create Staff Role
Settings → Roles → New Role → "Staff"

Permissions per collection:
| Collection | Create | Read | Update | Delete |
|-----------|--------|------|--------|--------|
| items | ✓ | ✓ | ✓ | ✗ |
| brands, verticals, products, subcategories | ✗ | ✓ | ✗ | ✗ |
| packing_units, variant_params_* | ✗ | ✓ | ✗ | ✗ |
| prospects, suppliers | ✓ | ✓ | ✓ | ✗ |
| storage_places/zones/slots | ✓ | ✓ | ✓ | ✗ |

### 9.4 Directus Custom Features Available (Free, Self-Hosted)
Directus is fully open source — all features included:
- **Insights** — built-in dashboard builder (replaces Grafana for KPIs)
- **Flows** — visual automation (replaces n8n for simple workflows)
- **Files** — media manager (connected to MinIO automatically)
- **Translations** — multilingual field labels
- **Extensions** — custom interfaces, hooks, endpoints via JS modules
  - Place in `/mnt/data/visualinventory/directus/extensions/`
  - Restart directus: `docker compose restart directus`

### 9.5 Field Configuration for Items Table
In Directus Settings → Data Model → items, set these interfaces:

| Field | Interface | Note |
|-------|-----------|------|
| `keyword_id` | Input | Read-only — auto-generated by DB trigger |
| `brand_id` | Many-to-One → brands | Display field: name |
| `vertical_id` | Many-to-One → verticals | Display field: name |
| `subcategory_id` | Many-to-One → subcategories | Display field: name |
| `product_id` | Many-to-One → products | Display field: name |
| `variant_param1_id` | Many-to-One → variant_params_1 | Display field: name |
| `p_unit` | Input (Integer) | Min: 1 |
| `stock_parcels` | Input (Integer) | Min: 0 |
| `retail_price_unit` | Input (Decimal) | Prefix: ₹ |
| `reorder_threshold` | Input (Integer) | Min: 0 |

---

## SECTION 10 — Typesense Setup for VisualInventory

### 10.1 Create items collection schema

Run this once (from your local machine or Oracle VM):

```bash
curl -X POST \
  -H "X-TYPESENSE-API-KEY: YOUR_TYPESENSE_API_KEY" \
  -H "Content-Type: application/json" \
  https://typesense.yourdomain.com/collections \
  -d '{
    "name": "items",
    "fields": [
      {"name": "id",                        "type": "int32"},
      {"name": "firm_id",                   "type": "string", "facet": true},
      {"name": "item_name",                 "type": "string"},
      {"name": "keyword_id",                "type": "string", "optional": true},
      {"name": "brand_name",                "type": "string", "optional": true, "facet": true},
      {"name": "vertical_name",             "type": "string", "optional": true, "facet": true},
      {"name": "subcategory_name",          "type": "string", "optional": true, "facet": true},
      {"name": "stock_parcels",             "type": "int32"},
      {"name": "retail_price_unit",         "type": "float"},
      {"name": "wholesale_price_unit",      "type": "float"},
      {"name": "reorder_threshold",         "type": "int32"}
    ],
    "default_sorting_field": "stock_parcels"
  }'
```

### 10.2 Sync Supabase → Typesense (initial + incremental)

Add to `src/lib/typesense.ts` in your React project:

```typescript
import Typesense from 'typesense';

export const typesense = new Typesense.Client({
  nodes: [{ host: 'typesense.yourdomain.com', port: 443, protocol: 'https' }],
  apiKey: import.meta.env.VITE_TYPESENSE_SEARCH_KEY, // read-only search key
  connectionTimeoutSeconds: 2,
});

// Search items — called from DAL.items.search() as primary, Supabase FTS as fallback
export async function searchItems(query: string, firmId: string, filters?: {
  brand?: string;
  vertical?: string;
  subcategory?: string;
}) {
  const filterBy = [`firm_id:=${firmId}`];
  if (filters?.brand)       filterBy.push(`brand_name:=${filters.brand}`);
  if (filters?.vertical)    filterBy.push(`vertical_name:=${filters.vertical}`);
  if (filters?.subcategory) filterBy.push(`subcategory_name:=${filters.subcategory}`);

  return typesense.collections('items').documents().search({
    q: query,
    query_by: 'item_name,keyword_id,brand_name,subcategory_name',
    filter_by: filterBy.join(' && '),
    per_page: 30,
    typo_tokens_threshold: 1,  // catches typos in item names
  });
}
```

### 10.3 Create a read-only API key for frontend

```bash
curl -X POST \
  -H "X-TYPESENSE-API-KEY: YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  https://typesense.yourdomain.com/keys \
  -d '{
    "description": "Search-only key for React frontend",
    "actions": ["documents:search"],
    "collections": ["items"]
  }'
```

Use the returned key as `VITE_TYPESENSE_SEARCH_KEY` — safe to expose in frontend.

---

## SECTION 11 — React App Environment Updates

Update `.env.production` (Vite):

```bash
VITE_MINIO_ENDPOINT=https://minio.yourdomain.com
VITE_MINIO_ACCESS_KEY=vi_admin
VITE_MINIO_SECRET_KEY=your_minio_password

VITE_TYPESENSE_SEARCH_KEY=your_readonly_search_key
VITE_TYPESENSE_HOST=typesense.yourdomain.com

VITE_DIRECTUS_URL=https://directus.yourdomain.com
```

---

## SECTION 12 — Useful Management Commands

```bash
# ── From phone or laptop via SSH ──────────────────────────────────

# Check all services
cd ~/vi-services && docker compose ps

# View logs
docker compose logs -f directus
docker compose logs -f typesense
docker compose logs --tail=50 minio

# Restart a service
docker compose restart directus

# Pull latest images and redeploy
docker compose pull && docker compose up -d

# Check disk usage
df -h /mnt/data
du -sh /mnt/data/visualinventory/*

# Check RAM/CPU
htop

# ── Backup ────────────────────────────────────────────────────────

# Backup Typesense data
tar -czf typesense-backup-$(date +%Y%m%d).tar.gz /mnt/data/visualinventory/typesense/data

# MinIO data is on the 200GB volume — Oracle takes automatic backups
# if you enable Boot Volume Backups in the console (free for 5 backups)
```

---

## SECTION 13 — Troubleshooting

| Problem | Diagnosis | Fix |
|---------|-----------|-----|
| Caddy can't get SSL cert | DNS not propagated yet | Wait 10 min, check: `nslookup directus.yourdomain.com` |
| Directus can't connect to Supabase | Missing `?sslmode=require` in DB URL | Add it to `.env`, `docker compose up -d` |
| Port 80/443 blocked | Oracle iptables | Run the iptables commands from Section 1.4 |
| MinIO Console unreachable | Port 9001 not in security list | Add TCP 9001 to Oracle ingress rules |
| Typesense out of memory | 4GB default | Set `--memory-limit-bytes=2000000000` in compose command |
| Directus shows blank tables | Tables not enabled | Settings → Data Model → enable each table |
| Large file upload fails | Caddy default limit | Already handled by `request_body max_size 500MB` in Caddyfile |
| `permission denied` on /mnt/data | Wrong ownership | `sudo chown -R ubuntu:ubuntu /mnt/data/visualinventory` |

---

## SECTION 14 — Cost Summary

| Resource | Provider | Cost |
|----------|----------|------|
| VM (4 ARM cores, 24GB RAM) | Oracle Always Free | ₹0/month |
| Block Storage (200GB) | Oracle Always Free | ₹0/month |
| Postgres (relational data) | Supabase Free | ₹0/month |
| Domain (.com) | Cloudflare/any | ~₹800/year |
| Electricity (Oracle runs it) | Oracle | ₹0 |
| **Total** | | **~₹67/month** (domain cost amortized) |

vs. equivalent on paid cloud:
- Railway: ~$20/month (₹1,700)
- Render: ~$25/month (₹2,100)  
- DigitalOcean: ~$24/month (₹2,000)