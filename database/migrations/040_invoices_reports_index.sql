-- يدعم استعلامات التقارير: company + نوع + حالة + نطاق زمني
CREATE INDEX IF NOT EXISTS idx_invoices_company_type_status_created ON invoices(company_id, type, status, created_at);
