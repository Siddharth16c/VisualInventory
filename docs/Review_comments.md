Database design:
1. stock records should be separated from items. It's very vast and unorganised.
2. Price calculation should be a feature in UI, choices - unit price, pkt price and parcel price.
3. 


Marketing media:
1. Select items for catalog/pricelist generator, need to create general catalogs
2. Custom title text for catalog given in catalog generation feature instead of product catalog
3. wholesale unit price(per pack), item name, GIF in catalog

Billing features - 

cases - bill editing(update items||qty in the bill), bill canceled/bill returned(stock added back), price change
1. sales_orders exist as bills - sales_orders once logged can be edited/deleted/accessed in future, price change affects packaging_details table
2. sales_orders editing/deleting -> added back to the stock
3. sales_orders - downloaded as zip and saved externally for any use,  4. delete sales_orders - deletes data from the sales_orders table, sales_orders is a copy of bills table. 
5. Confirm that the sales_orders won't be changed/deleted further by deleting an sales_orders -> gets deleted and persisted forever to bills table.

Purchase sales_orders details -> categorise details by adding items directly into the table -> gets structured as parcels that are due for arrival, prepares for arranging space proactively.

Features for business AR:
1. Stock integrity - output logging channels -  internal movement, transferring and billing is already in place(either log bills right when you do customer or do it later for integrity).



stock calculation:
a parcel is made up of various/singular packaged units of 1 item(a parcel can have 1 unique item or multiple items);
stock items can be unpacked, so parcel_id as fk can be null;
whether we can gather records based on item_id(fk) in stock_details table and for one item_id - sum 3 types of stock types(either number of units of an item directly; unit_multiplier or u_multiplier * p_multiplier to get the total stock of an item; which means an item stock can exist in less than its u_multiplier number, it can be just u_multiplier, it can be u_multiplier and p_multiplier makes up a parcel) gather all 3 measurement flows and sum up for an item_id from stock_details to get the total stock of an item and then store the number in total_stock(or not?)?;



1. Recording stock - everything for a firm, from UI - direct entry manually from DB editor, through purchase order logging, stock number integrity through sales order, order return/replacements(editing)
2. Billing, sales orders - saved bills, credit manager(unpaid bills)
3. Prospects - routes, visits, route revisit planning
4. Media management - image/GIF upload for each item - catalogue/pricelist generation
5. Suppliers and adding purchase orders features
6. Separation of firms for all features, firm wise subdomain setting and authentication - access to features through user roles/credentials for each app instance given to firms/subdomains
7. Online hosting on vercel - prod ready(online/offline)
8. Reports/KPIs/accounting features
9. Design fixes - colors, responsive(mobile, tab and large devices)



_______
new features:
1. Daily task manager - sprint board(list of tasks); list of workers/identities; today's tasks arranged in hierarchy







Help me fix firm * sub domain based app instance divergence logic, I wanted app instances separated based on the data for each firm and 1 master admin that can access everything, many things are implemented and I have made many changes in the DB design too so I am stuck now, my current focus is to implement the changes based on new db design modification - I removed firm id dependency from all the tables except which were firm specific data tables so that all the firms can access data like vertical names, brand names and so on but items under verticals are specifically only fetched for the firms that added it, but I can currently see items added in firm x shown on all the firms instances I verified the db design and there is firm_id injected on the item row may be some issue with logic, I might have forgot to update logic after I implemented DB design change - removing firm_id from all the tables except on needed

Figure out what's the issue and come up with some solution

______________________________________

Honest assessment for your exact use case:

**Supabase free tier limits that matter for you:**
- 500MB database — 10k items across 3 firms fits easily (text data is tiny, ~50MB max)
- 1GB file storage — NOT enough for media/images at scale
- 2GB bandwidth/month — this is your real constraint with heavy daily reads
- Paused after 1 week inactivity — critical issue for daily use, project gets paused

**The inactivity pause is the biggest problem** — free tier Supabase pauses your project after 7 days of no activity, meaning staff arrive at work and the app is down for 2-3 minutes while it wakes up. This alone makes free tier unsuitable for daily billing use.

**Best approach for your situation:**

```
Reads  → TanStack Query cache (5min stale time)
Writes → Supabase directly (billing, stock updates)
Media  → Cloudflare R2 (free 10GB, never pauses)
DB     → Supabase Pro ($25/month) OR self-host
```

**But given it's a hobby/in-house project — the CSV approach is genuinely smart:**

For heavy read tables (items, products, brands, verticals) — load once on app start into Zustand store, refresh every 30 minutes or on explicit user refresh. This collapses 100s of daily read queries into ~5. Your billing page searches the Zustand store locally, only writes hit Supabase. This keeps you well within free tier bandwidth.

```typescript
// In store.ts — load items once, search locally
const useItemStore = create((set, get) => ({
  items: [],
  lastLoaded: null,
  loadItems: async () => {
    const age = Date.now() - (get().lastLoaded ?? 0);
    if (age < 30 * 60 * 1000) return; // skip if <30min old
    const data = await DAL.items.getAll();
    set({ items: data, lastLoaded: Date.now() });
  },
  searchItems: (query) => {
    const q = query.toLowerCase();
    return get().items.filter(i =>
      i.item_name.toLowerCase().includes(q) ||
      i.keyword_id?.toLowerCase().includes(q)
    );
  }
}));
```

**My recommended stack for your case:**

| Need | Solution | Cost |
|------|----------|------|
| DB | Supabase free + ping keepalive | ₹0 |
| Media | Cloudflare R2 | ₹0 |
| Read caching | Zustand store + 30min refresh | ₹0 |
| Writes | Supabase direct | ₹0 |
| Pause prevention | Cron ping every 3 days | ₹0 |

**Prevent Supabase pause with a free cron ping** — use cron-job.org (free) to hit your Supabase URL every 3 days, keeps the project alive permanently without upgrading.

This setup handles 10k items, 100s of daily billing writes, and all 3 firms comfortably on the free tier with zero cost — the Zustand cache layer is the key piece that makes it work.