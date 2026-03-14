import { NextResponse } from "next/server";
import { auth } from "@/auth";

/** يتحقق من توفر مفاتيح الذكاء الاصطناعي (بدون كشف القيم) */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const gemini = !!process.env.GEMINI_API_KEY;
  const groq = !!process.env.GROQ_API_KEY;
  const openai = !!process.env.OPENAI_API_KEY;
  const aiAvailable = gemini || groq || openai;
  const providers = [gemini && "Gemini", groq && "Groq", openai && "OpenAI"].filter(Boolean);
  return NextResponse.json({
    geminiAvailable: gemini,
    groqAvailable: groq,
    openaiAvailable: openai,
    aiAvailable,
    providers,
    message: aiAvailable
      ? `الذكاء الاصطناعي متاح (${providers.join("، ")})`
      : "أضف GEMINI_API_KEY أو GROQ_API_KEY أو OPENAI_API_KEY في Vercel → Settings → Environment Variables ثم أعد النشر",
  });
}
