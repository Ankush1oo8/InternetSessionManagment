import { NextResponse } from "next/server"
import { buildSessionSummary } from "@/lib/db-session"

export async function GET() {
  const payload = await buildSessionSummary()
  return NextResponse.json(payload)
}
