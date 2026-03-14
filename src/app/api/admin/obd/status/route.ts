import { NextResponse } from "next/server";
import { auth } from "@/auth";

/** يتحقق من توفر مفاتيح الذكاء الاصطناعي (بدون كشف القيم) */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const gemini = !!process.env.GEMINI_API_KEY;
  const openai = !!process.env.OPENAI_API_KEY;
  return NextResponse.json({
    geminiAvailable: gemini,
    openaiAvailable: openai,
    aiAvailable: gemini || openai,
    message: gemini || openai
      ? "الذكاء الاصطناعي متاح"
      : "أضف GEMINI_API_KEY أو OPENAI_API_KEY في Vercel → Settings → Environment Variables ثم أعد النشر",
  });
}
