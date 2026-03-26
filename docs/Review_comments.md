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