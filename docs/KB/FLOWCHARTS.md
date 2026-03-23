# VisualOS — Workflow Flowcharts

## 1. Billing Workflow

```mermaid
flowchart TD
    START([Open Billing Page]) --> MODE{Select Pricing Mode}
    MODE -->|Lean| RETAIL["Set Retail Prices"]
    MODE -->|Bulk| WHOLESALE["Set Wholesale Prices"]
    RETAIL --> BROWSE[Browse / Search Items]
    WHOLESALE --> BROWSE
    BROWSE --> ADD[Add Items to Cart]
    ADD --> EDIT{Edit Cart?}
    EDIT -->|Qty| UPD_QTY[Update Quantity]
    EDIT -->|Price| UPD_PRICE[Override Price]
    EDIT -->|Discount| UPD_DISC[Apply Discount]
    UPD_QTY --> REVIEW
    UPD_PRICE --> REVIEW
    UPD_DISC --> REVIEW
    EDIT -->|No| REVIEW

    REVIEW[Review Cart Totals] --> PROSPECT[Select Prospect]
    PROSPECT --> PAYMENT[Enter Paid Amount]
    PAYMENT --> STATUS{Compute Payment Status}
    STATUS -->|"paid >= total"| PAID["Status: Paid"]
    STATUS -->|"0 < paid < total"| PARTIAL["Status: Partial"]
    STATUS -->|"paid = 0"| UNPAID["Status: Unpaid"]
    PAID --> CREATE[Create Order]
    PARTIAL --> CREATE
    UNPAID --> CREATE

    CREATE --> DEDUCT[Deduct Stock for Each Item]
    DEDUCT --> BILL[Generate Bill Record]
    BILL --> PRINT{Print Format?}
    PRINT -->|A4| A4[Print A4 Invoice]
    PRINT -->|Thermal| THERMAL[Print Thermal Receipt]
    PRINT -->|RawBT| RAWBT[Generate 58mm PDF]
    PRINT -->|Share| SHARE[Share PDF via Web Share]
    A4 --> DONE([Order Complete])
    THERMAL --> DONE
    RAWBT --> DONE
    SHARE --> DONE
```

---

## 2. Inventory Item Creation

```mermaid
flowchart TD
    START([Click 'Add Item']) --> CAT[Select Category]
    CAT --> PROD[Select Product<br/>filtered by category]
    PROD --> NAME[Enter Item Name + Size]
    NAME --> BRAND[Select Brand<br/>filtered by vertical]
    BRAND --> PACK[Select Packing Unit]
    PACK --> PRICES[Enter 4 Prices<br/>Retail/Wholesale × Piece/Pack]
    PRICES --> MRP[Enter MRP]
    MRP --> STOCK[Enter Stock Qty]
    STOCK --> SAVE{Save}
    SAVE -->|Valid| DB[(IndexedDB<br/>db.items.add)]
    SAVE -->|Missing Name| ERR[Show Error Toast]
    DB --> TOAST[Show Success Toast]
    TOAST --> CLOSE[Close Modal]
```

---

## 3. Price List PDF Generation

```mermaid
flowchart TD
    START([Open Price List]) --> LOAD[Load All Items from DB]
    LOAD --> SEARCH[Search / Filter Items]
    SEARCH --> SELECT[Select Items via Checkboxes]
    SELECT --> EDIT{Edit Prices?}
    EDIT -->|Yes| OVERRIDE[Override Prices<br/>temporary, not saved to DB]
    EDIT -->|No| GEN
    OVERRIDE --> GEN
    GEN[Click 'Generate PDF'] --> HEAD[Add Business Name Heading]
    HEAD --> TABLE[Build Table:<br/>Item, Size, Brand,<br/>Retail/pc, Retail/pk, Wholesale/pc]
    TABLE --> ALT[Alternate Row Backgrounds]
    ALT --> PDF[(jsPDF → Download)]
```

---

## 4. Backup & Restore

```mermaid
flowchart TD
    subgraph Export
        E_START([Click Export]) --> E_TABLES[Read All Table Names]
        E_TABLES --> E_DATA[Fetch Data from Each Table]
        E_DATA --> E_MEDIA{Has product_media?}
        E_MEDIA -->|Yes| E_B64[Encode Blobs → Base64]
        E_MEDIA -->|No| E_JSON
        E_B64 --> E_JSON[Build JSON Object]
        E_JSON --> E_DOWNLOAD[Download .json File]
    end

    subgraph Import
        I_START([Click Import]) --> I_FILE[Select .json File]
        I_FILE --> I_PARSE[Parse JSON]
        I_PARSE --> I_VALID{Valid Structure?}
        I_VALID -->|No| I_ERR[Show Error Toast]
        I_VALID -->|Yes| I_CLEAR[Clear All Tables]
        I_CLEAR --> I_RESTORE[BulkAdd Each Table]
        I_RESTORE --> I_MEDIA{Has media?}
        I_MEDIA -->|Yes| I_BLOB[Decode Base64 → Blobs]
        I_MEDIA -->|No| I_DONE
        I_BLOB --> I_DONE[Show Success Toast]
    end
```

---

## 5. Application Data Flow

```mermaid
flowchart LR
    subgraph Browser
        UI["React Pages<br/>(Inventory, Billing, ...)"]
        STORE["Zustand Store<br/>(Cart, UI, Media)"]
        DB["Dexie.js<br/>(IndexedDB)"]
    end

    UI -->|"useAppStore()"| STORE
    STORE -->|"setPricingMode()"| UI
    UI -->|"db.items.add()"| DB
    DB -->|"useLiveQuery()"| UI
    UI -->|"jsPDF"| PDF["PDF Output"]
    UI -->|"react-to-print"| PRINT["Printer"]
    UI -->|"Web Share API"| SHARE["Share"]
```
