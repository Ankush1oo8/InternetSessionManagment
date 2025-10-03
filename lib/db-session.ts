import { createAdminClient } from "@/lib/supabase/admin"

type DeviceStatus = "available" | "busy" | "stopped"

export async function getDevices() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from("devices").select("*").order("id")
  if (error) throw error
  return (data ?? []).map((d: any) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    mbPerMinute: Number(d.mb_per_minute),
  }))
}

async function getActiveSession() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

async function getCurrentOpenSegment(sessionId: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("session_segments")
    .select("*")
    .eq("session_id", sessionId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

async function pickAvailableDevice() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("status", "available")
    .order("id")
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

async function markDeviceStatus(id: string, status: DeviceStatus) {
  const supabase = await createAdminClient()
  const { error } = await supabase.from("devices").update({ status }).eq("id", id)
  if (error) throw error
}

export async function resetAll() {
  // Recreate initial state: clear sessions/segments and reset devices to A/B/C
  const supabase = await createAdminClient()
  // Delete dependent first
  await supabase.from("session_segments").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await supabase.from("sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  // Upsert initial devices
  const seed = [
    { id: "dev-a", name: "Device A", status: "available", mb_per_minute: 3 },
    { id: "dev-b", name: "Device B", status: "available", mb_per_minute: 2 },
    { id: "dev-c", name: "Device C", status: "available", mb_per_minute: 4 },
  ]
  const { error } = await supabase.from("devices").upsert(seed, { onConflict: "id" })
  if (error) throw error
  return { ok: true }
}

export async function startSession() {
  const supabase = await createAdminClient()
  // If an active session exists, return it
  const existing = await getActiveSession()
  if (existing) return existing

  const { data: session, error: sessErr } = await supabase
    .from("sessions")
    .insert({}) // defaults handle started_at and id
    .select("*")
    .single()
  if (sessErr) throw sessErr

  const device = await pickAvailableDevice()
  if (device) {
    await markDeviceStatus(device.id, "busy")
    const { error: segErr } = await supabase
      .from("session_segments")
      .insert({ session_id: session.id, device_id: device.id, started_at: new Date().toISOString() })
    if (segErr) throw segErr
  }
  return session
}

export async function stopCurrentDeviceAndAutoswitch() {
  const supabase = await createAdminClient()
  const session = await getActiveSession()
  if (!session) return { session: null, switchedTo: null }

  const current = await getCurrentOpenSegment(session.id)
  if (!current) return { session, switchedTo: null }

  // Stop current device
  const { data: deviceRow, error: devErr } = await supabase
    .from("devices")
    .select("*")
    .eq("id", current.device_id)
    .single()
  if (devErr) throw devErr

  await markDeviceStatus(current.device_id, "stopped")

  // Close current segment and compute MB used
  const endISO = new Date().toISOString()
  const durMin = (new Date(endISO).getTime() - new Date(current.started_at as string).getTime()) / 60000
  const mbPerMinute = Number(deviceRow.mb_per_minute ?? 2)
  const mbUsed = +(Math.max(0, durMin) * mbPerMinute).toFixed(2)
  const { error: updSegErr } = await supabase
    .from("session_segments")
    .update({ ended_at: endISO, mb_used: mbUsed })
    .eq("id", current.id)
  if (updSegErr) throw updSegErr

  // Switch to next available, if any
  const next = await pickAvailableDevice()
  if (next) {
    await markDeviceStatus(next.id, "busy")
    const { error: newSegErr } = await supabase
      .from("session_segments")
      .insert({ session_id: session.id, device_id: next.id, started_at: new Date().toISOString() })
    if (newSegErr) throw newSegErr
    return { session, switchedTo: next.id }
  }

  return { session, switchedTo: null }
}

export async function buildSessionSummary() {
  const supabase = await createAdminClient()
  // Devices
  const { data: devices, error: devErr } = await supabase.from("devices").select("*").order("id")
  if (devErr) throw devErr

  // Active session
  const session = await getActiveSession()

  // Segments for active session
  let segments: Array<{
    id: string
    session_id: string
    device_id: string
    started_at: string
    ended_at: string | null
    mb_used: number | null
  }> = []
  if (session) {
    const { data: segs, error: segErr } = await supabase
      .from("session_segments")
      .select("*")
      .eq("session_id", session.id)
      .order("started_at", { ascending: true })
    if (segErr) throw segErr
    segments = segs ?? []
  }

  // Compute live usage and per-device totals
  const nowTs = Date.now()
  const perDevice = new Map<string, { deviceId: string; name: string; durationMin: number; mbUsed: number }>()
  for (const d of devices ?? []) {
    perDevice.set(d.id, { deviceId: d.id, name: d.name, durationMin: 0, mbUsed: 0 })
  }

  let currentDeviceId: string | null = null
  let liveMbUsed = 0

  for (const seg of segments) {
    const dev = (devices ?? []).find((d) => d.id === seg.device_id)
    const mbPerMinute = Number(dev?.mb_per_minute ?? 2)
    const start = new Date(seg.started_at).getTime()
    const end = seg.ended_at ? new Date(seg.ended_at).getTime() : nowTs
    const durMin = Math.max(0, (end - start) / 60000)
    const mb = seg.mb_used ?? +(durMin * mbPerMinute).toFixed(2)
    const rec = perDevice.get(seg.device_id)
    if (rec) {
      rec.durationMin += durMin
      rec.mbUsed += mb
    }
    if (!seg.ended_at) {
      currentDeviceId = seg.device_id
      liveMbUsed = +(Math.max(0, (nowTs - start) / 60000) * mbPerMinute).toFixed(2)
    }
  }

  const perDeviceArr = Array.from(perDevice.values()).filter((x) => x.durationMin > 0 || x.mbUsed > 0)
  const totalDurationMin = perDeviceArr.reduce((a, b) => a + b.durationMin, 0)
  const totalMb = perDeviceArr.reduce((a, b) => a + b.mbUsed, 0)

  return {
    devices: (devices ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      mbPerMinute: Number(d.mb_per_minute),
    })),
    session: session ?? null,
    summary: {
      currentDeviceId,
      totalDurationMin: +totalDurationMin.toFixed(2),
      totalMb: +(totalMb + liveMbUsed).toFixed(2),
      perDevice: perDeviceArr.map((x) => ({
        deviceId: x.deviceId,
        name: x.name,
        durationMin: +x.durationMin.toFixed(2),
        mbUsed: +x.mbUsed.toFixed(2),
      })),
      liveMbUsed,
    },
  }
}

export async function getDeviceProfile(deviceId: string) {
  const supabase = await createAdminClient()

  // Fetch device
  const { data: device, error: deviceErr } = await supabase.from("devices").select("*").eq("id", deviceId).maybeSingle()
  if (deviceErr) throw deviceErr
  if (!device) {
    return null
  }

  // Fetch all segments for this device (for totals and last session computation)
  const { data: segsAll, error: segAllErr } = await supabase
    .from("session_segments")
    .select("*")
    .eq("device_id", deviceId)
    .order("started_at", { ascending: true })
  if (segAllErr) throw segAllErr

  const nowTs = Date.now()
  const mbPerMinute = Number(device.mb_per_minute ?? 2)

  // Compute totals till now across all sessions
  let totalDurationMin = 0
  let totalMb = 0
  for (const s of segsAll ?? []) {
    const start = new Date(s.started_at as string).getTime()
    const end = s.ended_at ? new Date(s.ended_at as string).getTime() : nowTs
    const dur = Math.max(0, (end - start) / 60000)
    const mb = s.mb_used ?? +(dur * mbPerMinute).toFixed(2)
    totalDurationMin += dur
    totalMb += mb
  }
  totalDurationMin = +totalDurationMin.toFixed(2)
  totalMb = +totalMb.toFixed(2)

  // Determine last session that touched this device
  // Group by session_id with latest started_at
  let lastSessionId: string | null = null
  let lastSessionMaxStart = -1
  const bySession = new Map<string, { segs: typeof segsAll; maxStart: number }>()
  for (const s of segsAll ?? []) {
    const start = new Date(s.started_at as string).getTime()
    const entry = bySession.get(s.session_id) ?? { segs: [] as any[], maxStart: -1 }
    entry.segs.push(s)
    entry.maxStart = Math.max(entry.maxStart, start)
    bySession.set(s.session_id, entry)
  }
  for (const [sid, { maxStart }] of bySession.entries()) {
    if (maxStart > lastSessionMaxStart) {
      lastSessionMaxStart = maxStart
      lastSessionId = sid
    }
  }

  let lastSession: {
    id: string
    startedAt: string
    endedAt: string | null
    durationMin: number
    mbUsed: number
  } | null = null

  if (lastSessionId) {
    const { data: sessRow, error: sessErr } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", lastSessionId)
      .maybeSingle()
    if (sessErr) throw sessErr
    const segsForLast = (bySession.get(lastSessionId)?.segs ?? []) as Array<{
      started_at: string
      ended_at: string | null
      mb_used: number | null
    }>
    let durSum = 0
    let mbSum = 0
    for (const s of segsForLast) {
      const start = new Date(s.started_at).getTime()
      const end = s.ended_at ? new Date(s.ended_at).getTime() : nowTs
      const dur = Math.max(0, (end - start) / 60000)
      const mb = s.mb_used ?? +(dur * mbPerMinute).toFixed(2)
      durSum += dur
      mbSum += mb
    }
    lastSession = sessRow
      ? {
          id: sessRow.id,
          startedAt: sessRow.started_at,
          endedAt: sessRow.ended_at,
          durationMin: +durSum.toFixed(2),
          mbUsed: +mbSum.toFixed(2),
        }
      : null
  }

  // Current session for this device (if active and open segment exists)
  const active = await getActiveSession()
  let currentSession: {
    sessionId: string
    startedAt: string
    durationSoFarMin: number
    liveMbUsed: number
  } | null = null

  if (active) {
    const open = await getCurrentOpenSegment(active.id)
    if (open && open.device_id === deviceId) {
      const start = new Date(open.started_at as string).getTime()
      const dur = Math.max(0, (nowTs - start) / 60000)
      currentSession = {
        sessionId: active.id,
        startedAt: open.started_at as string,
        durationSoFarMin: +dur.toFixed(2),
        liveMbUsed: +(dur * mbPerMinute).toFixed(2),
      }
    }
  }

  return {
    device: {
      id: device.id,
      name: device.name,
      status: device.status,
      mbPerMinute: Number(device.mb_per_minute),
    },
    totalsTillNow: {
      durationMin: totalDurationMin,
      mbUsed: totalMb,
    },
    lastSession,
    currentSession,
  }
}
