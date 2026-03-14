import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

const SYSTEM_COMPANY_ID = "company-system";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await db.execute({
      sql: "SELECT id, description, quantity, unit_price, total, created_at FROM repair_order_services WHERE repair_order_id = ? ORDER BY created_at",
      args: [id],
    });

    const services = result.rows.map((r) => ({
      id: r.id,
      description: String(r.description ?? ""),
      quantity: Number(r.quantity ?? 1),
      unit_price: Number(r.unit_price ?? 0),
      total: Number(r.total ?? 0),
      created_at: r.created_at,
    }));

    return NextResponse.json(services);
  } catch (error) {
    console.error("Services GET error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id: orderId } = await params;

  try {
    const body = await request.json();
    const { description, quantity, unit_price } = body;

    if (!description?.trim()) {
      return NextResponse.json({ error: "وصف الخدمة مطلوب" }, { status: 400 });
    }

    const qty = Number(quantity) || 1;
    const price = Number(unit_price) || 0;
    const total = qty * price;

    const orderCheck = await db.execute({
      sql: "SELECT id FROM repair_orders WHERE id = ? AND company_id = ?",
      args: [orderId, SYSTEM_COMPANY_ID],
    });
    if (orderCheck.rows.length === 0) {
      return NextResponse.json({ error: "أمر غير موجود" }, { status: 404 });
    }

    const serviceId = randomUUID();
    await db.execute({
      sql: "INSERT INTO repair_order_services (id, repair_order_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)",
      args: [serviceId, orderId, description.trim(), qty, price, total],
    });

    return NextResponse.json({
      id: serviceId,
      description: description.trim(),
      quantity: qty,
      unit_price: price,
      total,
    });
  } catch (error) {
    console.error("Service POST error:", error);
    return NextResponse.json({ error: "فشل في إضافة الخدمة" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("service_id");
  if (!serviceId) {
    return NextResponse.json({ error: "معرف الخدمة مطلوب" }, { status: 400 });
  }

  try {
    await db.execute({
      sql: "DELETE FROM repair_order_services WHERE id = ?",
      args: [serviceId],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Service DELETE error:", error);
    return NextResponse.json({ error: "فشل في الحذف" }, { status: 500 });
  }
}
