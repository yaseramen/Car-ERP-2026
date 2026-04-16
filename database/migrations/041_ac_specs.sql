-- بيانات تكييف مرجعية (ذاكرة مشتركة عبر المنصة) — مطابقة ماركة/موديل/سنوات
CREATE TABLE IF NOT EXISTS ac_specs (
    id TEXT PRIMARY KEY,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    make_key TEXT NOT NULL,
    model_key TEXT NOT NULL,
    year_from INTEGER NOT NULL,
    year_to INTEGER,
    refrigerant_type TEXT NOT NULL,
    refrigerant_weight REAL,
    oil_type TEXT,
    oil_amount REAL,
    last_updated TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ac_specs_make_model ON ac_specs(make_key, model_key);
-- سنة نهاية NULL = «مستمر» — نميّزها في فهرس التفرد لتفادي صفوف مكررة
CREATE UNIQUE INDEX IF NOT EXISTS idx_ac_specs_unique_vehicle
ON ac_specs(make_key, model_key, year_from, ifnull(year_to, -999999));
