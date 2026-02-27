const r=`# VisualOS — Workflow Flowcharts\r
\r
## 1. Billing Workflow\r
\r
\`\`\`mermaid\r
flowchart TD\r
    START([Open Billing Page]) --> MODE{Select Pricing Mode}\r
    MODE -->|Lean| RETAIL["Set Retail Prices"]\r
    MODE -->|Bulk| WHOLESALE["Set Wholesale Prices"]\r
    RETAIL --> BROWSE[Browse / Search Items]\r
    WHOLESALE --> BROWSE\r
    BROWSE --> ADD[Add Items to Cart]\r
    ADD --> EDIT{Edit Cart?}\r
    EDIT -->|Qty| UPD_QTY[Update Quantity]\r
    EDIT -->|Price| UPD_PRICE[Override Price]\r
    EDIT -->|Discount| UPD_DISC[Apply Discount]\r
    UPD_QTY --> REVIEW\r
    UPD_PRICE --> REVIEW\r
    UPD_DISC --> REVIEW\r
    EDIT -->|No| REVIEW\r
\r
    REVIEW[Review Cart Totals] --> PROSPECT[Select Prospect]\r
    PROSPECT --> PAYMENT[Enter Paid Amount]\r
    PAYMENT --> STATUS{Compute Payment Status}\r
    STATUS -->|"paid >= total"| PAID["Status: Paid"]\r
    STATUS -->|"0 < paid < total"| PARTIAL["Status: Partial"]\r
    STATUS -->|"paid = 0"| UNPAID["Status: Unpaid"]\r
    PAID --> CREATE[Create Order]\r
    PARTIAL --> CREATE\r
    UNPAID --> CREATE\r
\r
    CREATE --> DEDUCT[Deduct Stock for Each Item]\r
    DEDUCT --> BILL[Generate Bill Record]\r
    BILL --> PRINT{Print Format?}\r
    PRINT -->|A4| A4[Print A4 Invoice]\r
    PRINT -->|Thermal| THERMAL[Print Thermal Receipt]\r
    PRINT -->|RawBT| RAWBT[Generate 58mm PDF]\r
    PRINT -->|Share| SHARE[Share PDF via Web Share]\r
    A4 --> DONE([Order Complete])\r
    THERMAL --> DONE\r
    RAWBT --> DONE\r
    SHARE --> DONE\r
\`\`\`\r
\r
---\r
\r
## 2. Inventory Item Creation\r
\r
\`\`\`mermaid\r
flowchart TD\r
    START([Click 'Add Item']) --> CAT[Select Category]\r
    CAT --> PROD[Select Product<br/>filtered by category]\r
    PROD --> NAME[Enter Item Name + Size]\r
    NAME --> BRAND[Select Brand<br/>filtered by vertical]\r
    BRAND --> PACK[Select Packing Unit]\r
    PACK --> PRICES[Enter 4 Prices<br/>Retail/Wholesale × Piece/Pack]\r
    PRICES --> MRP[Enter MRP]\r
    MRP --> STOCK[Enter Stock Qty]\r
    STOCK --> SAVE{Save}\r
    SAVE -->|Valid| DB[(IndexedDB<br/>db.items.add)]\r
    SAVE -->|Missing Name| ERR[Show Error Toast]\r
    DB --> TOAST[Show Success Toast]\r
    TOAST --> CLOSE[Close Modal]\r
\`\`\`\r
\r
---\r
\r
## 3. Price List PDF Generation\r
\r
\`\`\`mermaid\r
flowchart TD\r
    START([Open Price List]) --> LOAD[Load All Items from DB]\r
    LOAD --> SEARCH[Search / Filter Items]\r
    SEARCH --> SELECT[Select Items via Checkboxes]\r
    SELECT --> EDIT{Edit Prices?}\r
    EDIT -->|Yes| OVERRIDE[Override Prices<br/>temporary, not saved to DB]\r
    EDIT -->|No| GEN\r
    OVERRIDE --> GEN\r
    GEN[Click 'Generate PDF'] --> HEAD[Add Business Name Heading]\r
    HEAD --> TABLE[Build Table:<br/>Item, Size, Brand,<br/>Retail/pc, Retail/pk, Wholesale/pc]\r
    TABLE --> ALT[Alternate Row Backgrounds]\r
    ALT --> PDF[(jsPDF → Download)]\r
\`\`\`\r
\r
---\r
\r
## 4. Backup & Restore\r
\r
\`\`\`mermaid\r
flowchart TD\r
    subgraph Export\r
        E_START([Click Export]) --> E_TABLES[Read All Table Names]\r
        E_TABLES --> E_DATA[Fetch Data from Each Table]\r
        E_DATA --> E_MEDIA{Has product_media?}\r
        E_MEDIA -->|Yes| E_B64[Encode Blobs → Base64]\r
        E_MEDIA -->|No| E_JSON\r
        E_B64 --> E_JSON[Build JSON Object]\r
        E_JSON --> E_DOWNLOAD[Download .json File]\r
    end\r
\r
    subgraph Import\r
        I_START([Click Import]) --> I_FILE[Select .json File]\r
        I_FILE --> I_PARSE[Parse JSON]\r
        I_PARSE --> I_VALID{Valid Structure?}\r
        I_VALID -->|No| I_ERR[Show Error Toast]\r
        I_VALID -->|Yes| I_CLEAR[Clear All Tables]\r
        I_CLEAR --> I_RESTORE[BulkAdd Each Table]\r
        I_RESTORE --> I_MEDIA{Has media?}\r
        I_MEDIA -->|Yes| I_BLOB[Decode Base64 → Blobs]\r
        I_MEDIA -->|No| I_DONE\r
        I_BLOB --> I_DONE[Show Success Toast]\r
    end\r
\`\`\`\r
\r
---\r
\r
## 5. Application Data Flow\r
\r
\`\`\`mermaid\r
flowchart LR\r
    subgraph Browser\r
        UI["React Pages<br/>(Inventory, Billing, ...)"]\r
        STORE["Zustand Store<br/>(Cart, UI, Media)"]\r
        DB["Dexie.js<br/>(IndexedDB)"]\r
    end\r
\r
    UI -->|"useAppStore()"| STORE\r
    STORE -->|"setPricingMode()"| UI\r
    UI -->|"db.items.add()"| DB\r
    DB -->|"useLiveQuery()"| UI\r
    UI -->|"jsPDF"| PDF["PDF Output"]\r
    UI -->|"react-to-print"| PRINT["Printer"]\r
    UI -->|"Web Share API"| SHARE["Share"]\r
\`\`\`\r
`;export{r as default};
