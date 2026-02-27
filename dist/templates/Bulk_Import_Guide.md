# VisualOS Bulk Data Import Guide

To easily add hundreds of items and their associated reference data (like brands, categories, and products) at once, you can upload a CSV file directly in the application.

## 1. Using the CSV Template
You will find the template layout at `Bulk_Import_Template.csv`. You can open this file in Excel, Google Sheets, or LibreOffice.

**Important:** You do not need to fill out multiple different tables for reference data. Simply type the name of the `Brand`, `Vertical`, or `Product Name` next to the item. If the system does not recognize it, it will create it automatically for you during the import process. This allows multiple people to share data entry tasks without worrying about matching internal IDs.

---

## 2. Column Rules & Definitions

| Column Name | Required? | Rule | Example |
|-------------|-----------|------|---------|
| **Item Name** | Yes | The exact, specific name of the atomic item you are selling. Must be unique to distinguish from other similar items. | "Apsara Long Notebook 200pg" |
| **Category** | Yes | The broad category this item falls under. | "Stationery", "Fireworks" |
| **Product Name** | Yes | A generic grouping name covering this item and similar cousins. | "Notebooks", "Pens" |
| **Vertical** | Yes | The business domain. | "Stationery", "FMCG" |
| **Brand Name** | No | The manufacturer. | "Apsara", "Reynolds" |
| **Packing Unit** | No | Meaningful name of the default package (defaults to "piece" if left blank). | "dozen", "box of 5" |
| **Packs Per Parcel**| Yes | How many of the `Packing Unit` fit inside a master carton/parcel? Use `1` if you don't use master cartons. | `10` |
| **Units Per Pack**  | Yes | How many atomic units fit in the `Packing Unit`? (e.g., 12 in a dozen). | `12` |
| **Stock Parcels** | No | Master cartons currently on hand. | `50` |
| **Retail Price (Unit)**| Yes | Consumer price for one atomic unit. | `45.00` |
| **Wholesale Price (Unit)**| Yes | Business partner price for one atomic unit. | `40.00` |
| **Maximum Retail Price (MRP)**| No | Printed consumer cost. | `50.00` |
| **Variant 1 (Size/Count)**| No | Distinguishing feature #1 | "200 Pages", "500ml" |
| **Variant 2 (Type)**| No | Distinguishing feature #2 | "Ruled", "Ballpoint" |
| **Image Location/Path** | No | You can upload images later if you prefer. Or, specify a local file path / web url as placeholder text. The app won't automatically suck files from random desktop paths due to browser security restrictions, but specifying a web URL (if your images are hosted somewhere e.g. AWS/Imgur) is supported by the system if configured. | `https://example.com/item.jpg` |

---

## 3. Review Process
When you upload the filled CSV file inside the app (under `Maintenance > Database Backup & Restore`), the system will display a "**Review Screen**". 
This screen tells you exactly how many *new* Brands, Verticals, and Products will be auto-generated because of your CSV, ensuring you didn't make any spelling typos that would accidental create two brands (e.g., "Apsara" and "Apsarra").

Once the reviewer clicks "Confirm Import", the database will cleanly insert all relational data in one sweep.
