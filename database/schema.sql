-- ============================================================
-- الأمين لخدمات السيارات - Database Schema
-- Al-Ameen Car Services - Comprehensive Schema
-- Turso/LibSQL Compatible
-- ============================================================

-- ==================== 1. المستخدمون والصلاحيات ====================

-- الشركات (Tenants) - مراكز الخدمة
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    tax_number TEXT,
    commercial_registration TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- المستخدمون
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('super_admin', 'tenant_owner', 'employee')),
    is_active INTEGER DEFAULT 1,
    is_blocked INTEGER DEFAULT 0,
    blocked_at TEXT,
    blocked_by TEXT,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_by) REFERENCES users(id)
);

-- الشاشات/الوحدات في النظام
CREATE TABLE IF NOT EXISTS screens (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    module TEXT NOT NULL CHECK(module IN ('warehouse', 'workshop', 'cashier', 'reports', 'settings', 'wallet'))
);

-- مصفوفة الصلاحيات (لكل موظف لكل شاشة)
CREATE TABLE IF NOT EXISTS user_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    screen_id TEXT NOT NULL,
    can_read INTEGER DEFAULT 0,
    can_create INTEGER DEFAULT 0,
    can_update INTEGER DEFAULT 0,
    can_delete INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, screen_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE
);

-- ==================== 2. النظام المالي والمحافظ ====================

-- محفظة الشركة
CREATE TABLE IF NOT EXISTS company_wallets (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL UNIQUE,
    balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'EGP',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- معاملات شحن المحفظة (بواسطة Super Admin)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('credit', 'debit', 'digital_service', 'obd_search')),
    description TEXT,
    reference_type TEXT,
    reference_id TEXT,
    performed_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (wallet_id) REFERENCES company_wallets(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- الخزائن (صندوق البيع، صندوق الورشة)
CREATE TABLE IF NOT EXISTS treasuries (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('sales', 'workshop')),
    balance REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, type),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- معاملات الخزائن
CREATE TABLE IF NOT EXISTS treasury_transactions (
    id TEXT PRIMARY KEY,
    treasury_id TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('in', 'out', 'transfer')),
    description TEXT,
    reference_type TEXT,
    reference_id TEXT,
    payment_method_id TEXT,
    performed_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (treasury_id) REFERENCES treasuries(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- ==================== 3. العملاء والموردين ====================

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_number TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_number TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- ==================== 4. المخازن والأصناف ====================

-- المخازن (رئيسي، عربات توزيع)
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('main', 'distribution')),
    location TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- صلاحيات المخازن (لموظفين محددين)
CREATE TABLE IF NOT EXISTS warehouse_permissions (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    can_read INTEGER DEFAULT 1,
    can_create INTEGER DEFAULT 0,
    can_update INTEGER DEFAULT 0,
    can_delete INTEGER DEFAULT 0,
    UNIQUE(warehouse_id, user_id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- الأصناف
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    barcode TEXT,
    category TEXT,
    unit TEXT DEFAULT 'قطعة',
    purchase_price REAL DEFAULT 0,
    sale_price REAL DEFAULT 0,
    min_quantity REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- مخزون الصنف في كل مخزن
CREATE TABLE IF NOT EXISTS item_warehouse_stock (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    quantity REAL DEFAULT 0,
    reserved_quantity REAL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(item_id, warehouse_id),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- حركة المخزون
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('in', 'out', 'transfer', 'adjustment', 'workshop_install', 'return')),
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    performed_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- ==================== 5. طرق الدفع ====================

CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('cash', 'vodafone_cash', 'instapay', 'cheque', 'bank', 'credit')),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- ==================== 6. الفواتير ====================

-- الفواتير (بيع، شراء، صيانة)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('sale', 'purchase', 'maintenance')),
    status TEXT NOT NULL CHECK(status IN ('draft', 'pending', 'paid', 'partial', 'returned', 'cancelled')),
    customer_id TEXT,
    supplier_id TEXT,
    repair_order_id TEXT,
    warehouse_id TEXT,
    treasury_id TEXT,
    subtotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    digital_service_fee REAL DEFAULT 0,
    total REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    notes TEXT,
    is_return INTEGER DEFAULT 0,
    original_invoice_id TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, invoice_number),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (treasury_id) REFERENCES treasuries(id),
    FOREIGN KEY (original_invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- بنود الفاتورة
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    item_id TEXT,
    description TEXT,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- مدفوعات الفاتورة
CREATE TABLE IF NOT EXISTS invoice_payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method_id TEXT NOT NULL,
    treasury_id TEXT,
    reference_number TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    FOREIGN KEY (treasury_id) REFERENCES treasuries(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ==================== 7. ورشة العمل ====================

-- أوامر الإصلاح
CREATE TABLE IF NOT EXISTS repair_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    customer_id TEXT,
    vehicle_plate TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    mileage INTEGER,
    vin TEXT,
    stage TEXT NOT NULL CHECK(stage IN ('received', 'inspection', 'maintenance', 'ready', 'completed')),
    received_at TEXT,
    inspection_notes TEXT,
    estimated_completion TEXT,
    completed_at TEXT,
    invoice_id TEXT,
    warehouse_id TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, order_number),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- قطع تم تركيبها في الورشة (ترتبط بالمخزن والفاتورة)
CREATE TABLE IF NOT EXISTS repair_order_items (
    id TEXT PRIMARY KEY,
    repair_order_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total REAL NOT NULL,
    stock_movement_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (stock_movement_id) REFERENCES stock_movements(id)
);

-- خدمات أمر الإصلاح (عمالة، فحص، إلخ)
CREATE TABLE IF NOT EXISTS repair_order_services (
    id TEXT PRIMARY KEY,
    repair_order_id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE
);

-- ==================== 8. OBD والتشخيص الذكي ====================

-- أكواد OBD المخزنة
CREATE TABLE IF NOT EXISTS obd_codes (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    code TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    causes TEXT,
    solutions TEXT,
    symptoms TEXT,
    source TEXT CHECK(source IN ('local', 'ai')),
    search_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- سجلات بحث OBD
CREATE TABLE IF NOT EXISTS obd_searches (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    obd_code_id TEXT,
    wallet_transaction_id TEXT,
    result_summary TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (obd_code_id) REFERENCES obd_codes(id),
    FOREIGN KEY (wallet_transaction_id) REFERENCES wallet_transactions(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ==================== الفهارس ====================

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_treasuries_company ON treasuries(company_id);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_treasury ON treasury_transactions(treasury_id);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_items_company ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_item_warehouse_stock_item ON item_warehouse_stock(item_id);
CREATE INDEX IF NOT EXISTS idx_item_warehouse_stock_warehouse ON item_warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_repair_orders_company ON repair_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_repair_orders_stage ON repair_orders(stage);
CREATE INDEX IF NOT EXISTS idx_repair_orders_customer ON repair_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_obd_codes_code ON obd_codes(code);
CREATE INDEX IF NOT EXISTS idx_obd_searches_company ON obd_searches(company_id);

-- ==================== البيانات الأولية ====================

-- الشاشات الافتراضية
INSERT OR IGNORE INTO screens (id, name_ar, name_en, module) VALUES
    ('screen_warehouse', 'المخزن', 'Warehouse', 'warehouse'),
    ('screen_workshop', 'الورشة', 'Workshop', 'workshop'),
    ('screen_cashier', 'الكاشير', 'Cashier', 'cashier'),
    ('screen_reports', 'التقارير', 'Reports', 'reports'),
    ('screen_settings', 'الإعدادات', 'Settings', 'settings'),
    ('screen_wallet', 'المحفظة', 'Wallet', 'wallet');

-- طرق الدفع الافتراضية (عامة)
INSERT OR IGNORE INTO payment_methods (id, company_id, name, type) VALUES
    ('pm_cash', NULL, 'نقدي', 'cash'),
    ('pm_vodafone', NULL, 'فودافون كاش', 'vodafone_cash'),
    ('pm_instapay', NULL, 'انستا باي', 'instapay'),
    ('pm_cheque', NULL, 'شيك', 'cheque'),
    ('pm_bank', NULL, 'تحويل بنكي', 'bank'),
    ('pm_credit', NULL, 'آجل', 'credit');
