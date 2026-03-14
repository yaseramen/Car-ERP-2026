import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";

const SYSTEM_COMPANY_ID = "company-system";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      name,
      code,
      barcode,
      category,
      unit,
      purchase_price,
      sale_price,
      min_quantity,
      min_quantity_enabled,
    } = body;

    const updates: string[] = ["updated_at = datetime('now')"];
    const args: (string | number | null)[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      args.push(name?.trim() || "");
    }
    if (code !== undefined) {
      updates.push("code = ?");
      args.push(code?.trim() || null);
    }
    if (barcode !== undefined) {
      updates.push("barcode = ?");
      args.push(barcode?.trim() || null);
    }
    if (category !== undefined) {
      updates.push("category = ?");
      args.push(category?.trim() || null);
    }
    if (unit !== undefined) {
      updates.push("unit = ?");
      args.push(unit?.trim() || "قطعة");
    }
    if (purchase_price !== undefined) {
      updates.push("purchase_price = ?");
      args.push(Number(purchase_price) || 0);
    }
    if (sale_price !== undefined) {
      updates.push("sale_price = ?");
      args.push(Number(sale_price) || 0);
    }
    if (min_quantity !== undefined || min_quantity_enabled !== undefined) {
      const minQty = min_quantity_enabled ? Number(min_quantity) || 0 : 0;
      updates.push("min_quantity = ?");
      args.push(minQty);
    }

    if (updates.length <= 1) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
    }

    args.push(id, SYSTEM_COMPANY_ID);

    await db.execute({
      sql: `UPDATE items SET ${updates.join(", ")} WHERE id = ? AND company_id = ?`,
      args: args as (string | number)[],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Item update error:", error);
    return NextResponse.json({ error: "فشل في التحديث" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const usedInInvoices = await db.execute({
      sql: "SELECT 1 FROM invoice_items WHERE item_id = ? LIMIT 1",
      args: [id],
    });

    const usedInRepair = await db.execute({
      sql: "SELECT 1 FROM repair_order_items WHERE item_id = ? LIMIT 1",
      args: [id],
    });

    if (usedInInvoices.rows.length > 0 || usedInRepair.rows.length > 0) {
      await db.execute({
        sql: "UPDATE items SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND company_id = ?",
        args: [id, SYSTEM_COMPANY_ID],
      });
      return NextResponse.json({ success: true, message: "تم تعطيل الصنف (مستخدم سابقاً)" });
    }

    await db.execute({
      sql: "DELETE FROM item_warehouse_stock WHERE item_id = ?",
      args: [id],
    });
    await db.execute({
      sql: "DELETE FROM items WHERE id = ? AND company_id = ?",
      args: [id, SYSTEM_COMPANY_ID],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Item delete error:", error);
    return NextResponse.json({ error: "فشل في الحذف" }, { status: 500 });
  }
}
