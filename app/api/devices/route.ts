import { NextResponse } from "next/server"
import { getDevices } from "@/lib/db-session"

export async function GET() {
  return NextResponse.json({ devices: await getDevices() })
}
