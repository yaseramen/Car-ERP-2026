-- كود الصنف والباركود فريدان لكل شركة (لا يُسمح بتكرار بين أصناف مختلفة)

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_company_code_unique
ON items (company_id, code)
WHERE code IS NOT NULL AND TRIM(code) != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_company_barcode_unique
ON items (company_id, barcode)
WHERE barcode IS NOT NULL AND TRIM(barcode) != '';
