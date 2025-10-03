import { NextResponse } from "next/server"
import { startSession, buildSessionSummary } from "@/lib/db-session"

export async function POST() {
  await startSession()
  const payload = await buildSessionSummary()
  return NextResponse.json(payload)
}
