import { NextResponse } from "next/server"
import { resetAll, buildSessionSummary } from "@/lib/db-session"

export async function POST() {
  await resetAll()
  const payload = await buildSessionSummary()
  return NextResponse.json(payload)
}
