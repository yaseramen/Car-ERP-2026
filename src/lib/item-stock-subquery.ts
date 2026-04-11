/**
 * تجميع كميات المخزون لكل صنف — يُستخدم في JOIN بدل مُحدِّ فرعي لكل صف (يقلّل Rows Read على Turso).
 */
export const ITEM_STOCK_SUM_SUBQUERY = `(
  SELECT item_id, COALESCE(SUM(quantity), 0) AS stock_qty
  FROM item_warehouse_stock
  GROUP BY item_id
)`;
