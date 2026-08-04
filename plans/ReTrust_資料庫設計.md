# ReTrust 後端資料庫設計文件

> 對應功能：官方二手、C2C 二手、出租平台、官方論壇
> 設計原則：官方二手與 C2C 共用同一套「商品／訂單」骨幹，用欄位區分來源與交易型態，避免拆成兩套平行系統；論壇與交易系統分離但共用會員與商品資料，方便討論串引用商品。

---

## 一、模組總覽（ER 關係摘要）

```
users ──┬── seller_profiles
        ├── user_addresses
        ├── items (賣家/出租方)
        ├── orders (買家)
        ├── rental_orders (承租方)
        ├── favorites
        ├── reviews
        └── forum_threads / forum_posts

items ──┬── item_images
        ├── item_verifications（官方鑑定）
        ├── orders（銷售訂單）
        ├── rental_orders（租賃訂單）
        ├── favorites
        └── carbon_ledger

orders ──┬── escrow_transactions
         ├── shipments
         ├── reviews
         └── disputes

rental_orders ──┬── escrow_transactions
                └── shipments

forum_boards ── forum_threads ── forum_posts
```

---

## 二、會員與身分模組

### 2.1 `users`（會員主表）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | 會員 ID |
| email | VARCHAR(255) UNIQUE | 登入信箱 |
| phone | VARCHAR(20) UNIQUE | 手機號碼 |
| password_hash | VARCHAR(255) | 密碼雜湊 |
| nickname | VARCHAR(50) | 顯示暱稱 |
| avatar_url | VARCHAR(255) | 頭像 |
| oauth_provider | ENUM('none','apple','google','line') | 第三方登入來源 |
| role | ENUM('member','official_staff','admin') | 系統角色（一般會員／官方鑑定人員／管理員） |
| status | ENUM('active','suspended','deleted') | 帳號狀態 |
| carbon_saved_total | DECIMAL(10,2) | 累積減少碳排放（kg，快取欄位） |
| created_at / updated_at | DATETIME | 建立／更新時間 |

### 2.2 `seller_profiles`（賣家╱出租方擴充資料）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| user_id | BIGINT FK → users.id | |
| seller_type | ENUM('individual','official') | 個人賣家 / 官方 |
| rating_avg | DECIMAL(3,2) | 平均評價 |
| rating_count | INT | 評價筆數 |
| verified_at | DATETIME NULL | 賣家身分驗證通過時間（如金融實名） |
| payout_account | VARCHAR(100) | 收款帳戶（加密儲存） |

### 2.3 `user_addresses`
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| user_id | BIGINT FK | |
| recipient_name | VARCHAR(50) | |
| phone | VARCHAR(20) | |
| address_line | VARCHAR(255) | |
| is_default | BOOLEAN | |

---

## 三、商品模組（官方二手 + C2C 共用）

### 3.1 `categories`（商品分類，含 #復古穿搭、#質感小家電 等標籤化分類）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| parent_id | BIGINT NULL FK → categories.id | 支援多層分類 |
| name | VARCHAR(50) | |
| slug | VARCHAR(50) | URL 用代稱 |
| icon_url | VARCHAR(255) | |

### 3.2 `items`（商品／刊登主表）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| seller_id | BIGINT FK → users.id | 刊登者（個人或官方帳號） |
| category_id | BIGINT FK → categories.id | |
| title | VARCHAR(100) | |
| description | TEXT | |
| listing_source | ENUM('official','c2c') | 官方二手 / C2C |
| listing_type | SET('sale','rent') | 可同時支援出售與出租 |
| condition_grade | ENUM('S','A','B','C') | 成色分級 |
| condition_note | VARCHAR(255) | 賣家自填瑕疵說明 |
| price | DECIMAL(10,2) NULL | 出售價格 |
| original_price | DECIMAL(10,2) NULL | 原價（用於顯示折扣） |
| rental_price_per_day | DECIMAL(10,2) NULL | 日租價 |
| rental_deposit | DECIMAL(10,2) NULL | 租賃押金 |
| stock_status | ENUM('available','reserved','sold','delisted') | |
| carbon_saved_kg | DECIMAL(6,2) | 該件商品預估減碳量 |
| ai_generated_desc | BOOLEAN | 是否為 AI 輔助生成描述 |
| view_count | INT DEFAULT 0 | |
| created_at / updated_at | DATETIME | |

### 3.3 `item_images`
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| item_id | BIGINT FK → items.id | |
| image_url | VARCHAR(255) | |
| sort_order | INT | |

### 3.4 `item_verifications`（官方鑑定報告，僅 `listing_source = official` 或申請官方認證的 C2C 商品使用）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| item_id | BIGINT FK → items.id | |
| inspector_id | BIGINT FK → users.id（role=official_staff） | 鑑定人員 |
| report_url | VARCHAR(255) | 鑑定報告文件 |
| grade_confirmed | ENUM('S','A','B','C') | 官方複驗後分級 |
| verified_at | DATETIME | |
| notes | TEXT | |

### 3.5 `favorites`（收藏／願望清單）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| user_id | BIGINT FK | |
| item_id | BIGINT FK | |
| created_at | DATETIME | |

---

## 四、交易模組

### 4.1 `orders`（銷售訂單，適用官方二手與 C2C 出售）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| item_id | BIGINT FK → items.id | |
| buyer_id | BIGINT FK → users.id | |
| seller_id | BIGINT FK → users.id | |
| amount | DECIMAL(10,2) | 訂單金額 |
| platform_fee | DECIMAL(10,2) | 平台手續費（可為 0，對應「零手續費優惠」） |
| status | ENUM('pending_payment','paid','shipped','delivered','completed','disputed','cancelled','refunded') | |
| shipping_address_id | BIGINT FK → user_addresses.id | |
| created_at / updated_at | DATETIME | |

### 4.2 `rental_orders`（租賃訂單，適用出租平台）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| item_id | BIGINT FK → items.id | |
| renter_id | BIGINT FK → users.id | 承租人 |
| owner_id | BIGINT FK → users.id | 出租人 |
| start_date | DATE | |
| end_date | DATE | |
| rental_amount | DECIMAL(10,2) | 租金總額 |
| deposit_amount | DECIMAL(10,2) | 押金 |
| deposit_status | ENUM('held','returned','deducted') | |
| status | ENUM('pending_payment','paid','in_use','returned','completed','disputed','cancelled') | |
| created_at / updated_at | DATETIME | |

### 4.3 `escrow_transactions`（第三方價金保管，訂單／租賃訂單共用）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| order_id | BIGINT NULL FK → orders.id | |
| rental_order_id | BIGINT NULL FK → rental_orders.id | 兩者擇一 |
| amount | DECIMAL(10,2) | |
| status | ENUM('held','released_to_seller','refunded_to_buyer') | |
| held_at | DATETIME | |
| released_at | DATETIME NULL | |

### 4.4 `shipments`（超商寄件物流）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| order_id | BIGINT NULL FK → orders.id | |
| rental_order_id | BIGINT NULL FK → rental_orders.id | |
| carrier | ENUM('7-11','family_mart','hct','other') | |
| tracking_no | VARCHAR(50) | |
| shipped_at | DATETIME NULL | |
| delivered_at | DATETIME NULL | |
| status | ENUM('pending','in_transit','delivered','returned') | |

### 4.5 `disputes`（爭議處理，對應「7 天內處理」規則）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| order_id | BIGINT NULL FK → orders.id | |
| rental_order_id | BIGINT NULL FK → rental_orders.id | |
| raised_by | BIGINT FK → users.id | |
| reason | VARCHAR(255) | |
| status | ENUM('open','under_review','resolved_refund','resolved_reject','closed') | |
| deadline_at | DATETIME | 建立時間 +7 天 |
| resolved_at | DATETIME NULL | |

### 4.6 `reviews`（買賣雙方互評）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| order_id | BIGINT NULL FK → orders.id | |
| rental_order_id | BIGINT NULL FK → rental_orders.id | |
| reviewer_id | BIGINT FK → users.id | |
| target_id | BIGINT FK → users.id | 被評價方 |
| rating | TINYINT (1-5) | |
| comment | VARCHAR(500) | |
| created_at | DATETIME | |

---

## 五、永續／碳足跡模組

### 5.1 `carbon_ledger`
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| user_id | BIGINT FK | 受益會員（買家或賣家，依業務規則） |
| item_id | BIGINT FK | |
| order_id | BIGINT NULL FK | |
| co2_saved_kg | DECIMAL(6,2) | |
| recorded_at | DATETIME | |

> `users.carbon_saved_total` 為此表的加總快取，避免每次讀取都做 SUM。

---

## 六、論壇模組

### 6.1 `forum_boards`（板塊，如「鑑定知識」「租賃心得」「賣家經驗」「官方公告」）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| name | VARCHAR(50) | |
| slug | VARCHAR(50) | |
| description | VARCHAR(255) | |

### 6.2 `forum_threads`
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| board_id | BIGINT FK → forum_boards.id | |
| user_id | BIGINT FK → users.id | 發文者 |
| title | VARCHAR(150) | |
| content | TEXT | |
| is_official | BOOLEAN | 是否為官方公告 |
| is_pinned | BOOLEAN | 置頂 |
| related_item_id | BIGINT NULL FK → items.id | 可引用討論的商品 |
| reply_count | INT DEFAULT 0 | 快取欄位 |
| created_at / updated_at | DATETIME | |

### 6.3 `forum_posts`（回覆）
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| thread_id | BIGINT FK → forum_threads.id | |
| user_id | BIGINT FK → users.id | |
| content | TEXT | |
| is_official_reply | BOOLEAN | 官方鑑定師／客服回覆標記 |
| created_at | DATETIME | |

---

## 七、行銷／通知模組

### 7.1 `coupons`
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| code | VARCHAR(30) UNIQUE | |
| discount_type | ENUM('fee_waiver','fixed_amount','percentage') | 對應「零手續費優惠」等活動 |
| discount_value | DECIMAL(10,2) | |
| valid_from / valid_to | DATETIME | |
| usage_limit | INT | |

### 7.2 `notifications`
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | BIGINT PK | |
| user_id | BIGINT FK | |
| type | ENUM('order_update','rental_update','forum_reply','system') | |
| content | VARCHAR(255) | |
| is_read | BOOLEAN | |
| created_at | DATETIME | |

---

## 八、設計備註

1. **官方 vs C2C 共用 `items` 表**：以 `listing_source` 區分，避免維護兩套結構；官方商品必定有對應的 `item_verifications` 紀錄，C2C 商品則可選擇性申請認證。
2. **出售與租賃分開建訂單表**：因為押金、租期、歸還狀態等欄位與一般買賣差異大，硬塞進同一張 `orders` 表會產生大量 NULL 欄位，故拆為 `orders` / `rental_orders`，兩者共用 `escrow_transactions`、`shipments`、`disputes`、`reviews`（皆用「擇一外鍵」設計）。
3. **分級系統（S/A/B/C）**：`items.condition_grade` 為賣家自填或系統預設，`item_verifications.grade_confirmed` 才是官方複驗後的最終權威分級，前端顯示應以後者優先。
4. **論壇與交易解耦**：`forum_threads.related_item_id` 為選填外鍵，讓討論串可以「掛」在某個商品下（如商品鑑定討論），但論壇本身不依賴交易資料也能獨立運作。
5. **手續費為 0 的活動**：不寫死在 `orders.platform_fee`，而是透過 `coupons` 的 `discount_type = fee_waiver` 套用，方便行銷活動下架後費用邏輯自動恢復。

---

## 九、SQL DDL（可直接執行的建表語法，MySQL 8 語法示例）

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  nickname VARCHAR(50),
  avatar_url VARCHAR(255),
  oauth_provider ENUM('none','apple','google','line') DEFAULT 'none',
  role ENUM('member','official_staff','admin') DEFAULT 'member',
  status ENUM('active','suspended','deleted') DEFAULT 'active',
  carbon_saved_total DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE seller_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  seller_type ENUM('individual','official') DEFAULT 'individual',
  rating_avg DECIMAL(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  verified_at DATETIME NULL,
  payout_account VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_addresses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  recipient_name VARCHAR(50),
  phone VARCHAR(20),
  address_line VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  parent_id BIGINT NULL,
  name VARCHAR(50),
  slug VARCHAR(50),
  icon_url VARCHAR(255),
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  seller_id BIGINT NOT NULL,
  category_id BIGINT,
  title VARCHAR(100),
  description TEXT,
  listing_source ENUM('official','c2c') DEFAULT 'c2c',
  listing_type SET('sale','rent') DEFAULT 'sale',
  condition_grade ENUM('S','A','B','C'),
  condition_note VARCHAR(255),
  price DECIMAL(10,2) NULL,
  original_price DECIMAL(10,2) NULL,
  rental_price_per_day DECIMAL(10,2) NULL,
  rental_deposit DECIMAL(10,2) NULL,
  stock_status ENUM('available','reserved','sold','delisted') DEFAULT 'available',
  carbon_saved_kg DECIMAL(6,2) DEFAULT 0,
  ai_generated_desc BOOLEAN DEFAULT FALSE,
  view_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE item_images (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT NOT NULL,
  image_url VARCHAR(255),
  sort_order INT DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE item_verifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT NOT NULL,
  inspector_id BIGINT NOT NULL,
  report_url VARCHAR(255),
  grade_confirmed ENUM('S','A','B','C'),
  verified_at DATETIME,
  notes TEXT,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (inspector_id) REFERENCES users(id)
);

CREATE TABLE favorites (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT NOT NULL,
  buyer_id BIGINT NOT NULL,
  seller_id BIGINT NOT NULL,
  amount DECIMAL(10,2),
  platform_fee DECIMAL(10,2) DEFAULT 0,
  status ENUM('pending_payment','paid','shipped','delivered','completed','disputed','cancelled','refunded') DEFAULT 'pending_payment',
  shipping_address_id BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (shipping_address_id) REFERENCES user_addresses(id)
);

CREATE TABLE rental_orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT NOT NULL,
  renter_id BIGINT NOT NULL,
  owner_id BIGINT NOT NULL,
  start_date DATE,
  end_date DATE,
  rental_amount DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  deposit_status ENUM('held','returned','deducted') DEFAULT 'held',
  status ENUM('pending_payment','paid','in_use','returned','completed','disputed','cancelled') DEFAULT 'pending_payment',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (renter_id) REFERENCES users(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE escrow_transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NULL,
  rental_order_id BIGINT NULL,
  amount DECIMAL(10,2),
  status ENUM('held','released_to_seller','refunded_to_buyer') DEFAULT 'held',
  held_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  released_at DATETIME NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (rental_order_id) REFERENCES rental_orders(id)
);

CREATE TABLE shipments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NULL,
  rental_order_id BIGINT NULL,
  carrier ENUM('7-11','family_mart','hct','other'),
  tracking_no VARCHAR(50),
  shipped_at DATETIME NULL,
  delivered_at DATETIME NULL,
  status ENUM('pending','in_transit','delivered','returned') DEFAULT 'pending',
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (rental_order_id) REFERENCES rental_orders(id)
);

CREATE TABLE disputes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NULL,
  rental_order_id BIGINT NULL,
  raised_by BIGINT NOT NULL,
  reason VARCHAR(255),
  status ENUM('open','under_review','resolved_refund','resolved_reject','closed') DEFAULT 'open',
  deadline_at DATETIME,
  resolved_at DATETIME NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (rental_order_id) REFERENCES rental_orders(id),
  FOREIGN KEY (raised_by) REFERENCES users(id)
);

CREATE TABLE reviews (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NULL,
  rental_order_id BIGINT NULL,
  reviewer_id BIGINT NOT NULL,
  target_id BIGINT NOT NULL,
  rating TINYINT,
  comment VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (rental_order_id) REFERENCES rental_orders(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (target_id) REFERENCES users(id)
);

CREATE TABLE carbon_ledger (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  order_id BIGINT NULL,
  co2_saved_kg DECIMAL(6,2),
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE forum_boards (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50),
  slug VARCHAR(50),
  description VARCHAR(255)
);

CREATE TABLE forum_threads (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  board_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  title VARCHAR(150),
  content TEXT,
  is_official BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  related_item_id BIGINT NULL,
  reply_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES forum_boards(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_item_id) REFERENCES items(id)
);

CREATE TABLE forum_posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  thread_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  content TEXT,
  is_official_reply BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE coupons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(30) UNIQUE,
  discount_type ENUM('fee_waiver','fixed_amount','percentage'),
  discount_value DECIMAL(10,2),
  valid_from DATETIME,
  valid_to DATETIME,
  usage_limit INT
);

CREATE TABLE notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type ENUM('order_update','rental_update','forum_reply','system'),
  content VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```
