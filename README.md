# VisualOS Inventory Management System

A comprehensive, offline-first Progressive Web App (PWA) for managing inventory, billing, and accounting for multi-domain businesses (Stationery, Cutlery, Fireworks, FMCG).

## Key Features

- **Inventory Management**: 3-tier stock tracking (Atomic -> Pack -> Parcel), generic products, and variant parameters.
- **Billing**: Retail/Wholesale pricing, thermal printing support, and saved bills.
- **Catalogue Builder**: Generate professional HTML flipbooks to share with customers.
- **Offline First**: Powered by IndexedDB (Dexie.js) - no server required.
- **Accounting & CRM**: Track revenue, costs, and manage prospect visits.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

## Documentation

- [Functional Documentation](docs/FUNCTIONAL.md) - detailed feature guide.
- [Technical Documentation](docs/TECHNICAL.md) - architecture, schema, and stack.
- [Deployment Guide](docs/DEPLOY.md) - hosting instructions.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **State**: Zustand
- **Database**: Dexie.js (IndexedDB)
- **Build**: Vite

## License

Private / Proprietary
