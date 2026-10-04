import { NextResponse } from "next/server";

const NVIDIA_URL = process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL ?? "openai/gpt-oss-20b";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.NVIDIA_API_KEY) {
    return NextResponse.json({ error: "NVIDIA_API_KEY is not configured." }, { status: 503 });
  }

  const body = (await request.json()) as { question?: string; projects?: unknown };
  const question = String(body.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "Question is required." }, { status: 400 });

  const prompt = `You are the reasoning layer for gODtECH Cockpit.
Use ONLY the supplied repository evidence and project state. Do not invent project details.
Be concise and decisive. Recommend priorities when asked.
Project evidence:
${JSON.stringify(body.projects)}
User question:
${question}`;

  const res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: [
        { role: "system", content: "You interpret GitHub/project-state evidence for a personal project cockpit." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 700
    })
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data?.error?.message ?? "NVIDIA request failed." }, { status: 502 });
  }

  return NextResponse.json({ answer: data?.choices?.[0]?.message?.content ?? "No answer returned." });
}
