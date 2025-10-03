import { NextResponse } from "next/server"
import { stopCurrentDeviceAndAutoswitch, buildSessionSummary } from "@/lib/db-session"

export async function POST() {
  await stopCurrentDeviceAndAutoswitch()
  const payload = await buildSessionSummary()
  return NextResponse.json(payload)
}
