type DeviceStatus = "available" | "busy" | "stopped"

export type Device = {
  id: string
  name: string
  status: DeviceStatus
  // Rough data rate in MB per minute for estimation
  mbPerMinute: number
}

export type Segment = {
  deviceId: string
  startedAt: number
  endedAt?: number
  // Store computed MB used at end; compute live for ongoing segment
  mbUsed?: number
}

export type Session = {
  id: string
  startedAt: number
  endedAt?: number
  segments: Segment[]
}

type Store = {
  devices: Device[]
  session: Session | null
}

const initialDevices: Device[] = [
  { id: "dev-a", name: "Device A", status: "available", mbPerMinute: 3 },
  { id: "dev-b", name: "Device B", status: "available", mbPerMinute: 2 },
  { id: "dev-c", name: "Device C", status: "available", mbPerMinute: 4 },
]

// Global singleton so state persists across route calls in dev/preview
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any
if (!g.__SESSION_STORE__) {
  g.__SESSION_STORE__ = {
    devices: structuredClone(initialDevices),
    session: null,
  } as Store
}
const store: Store = g.__SESSION_STORE__

function now() {
  return Date.now()
}

function pickAvailableDevice(): Device | null {
  const d = store.devices.find((x) => x.status === "available")
  return d ?? null
}

function markDeviceBusy(id: string) {
  const d = store.devices.find((x) => x.id === id)
  if (d) d.status = "busy"
}

function markDeviceStopped(id: string) {
  const d = store.devices.find((x) => x.id === id)
  if (d) d.status = "stopped"
}

export function getDevices() {
  return store.devices
}

export function getSession() {
  return store.session
}

export function resetAll() {
  store.devices = structuredClone(initialDevices)
  store.session = null
  return { ok: true }
}

export function startSession() {
  // If an active session exists, just return it
  if (store.session && !store.session.endedAt) {
    return store.session
  }

  const device = pickAvailableDevice()
  const session: Session = {
    id: `sess-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: now(),
    segments: [],
  }
  store.session = session

  if (device) {
    markDeviceBusy(device.id)
    session.segments.push({
      deviceId: device.id,
      startedAt: now(),
    })
  }
  return session
}

function closeCurrentSegmentAndComputeMB(session: Session) {
  const current = getCurrentSegment(session)
  if (!current) return

  if (!current.endedAt) {
    current.endedAt = now()
  }
  const durMin = Math.max(0, (current.endedAt - current.startedAt) / 60000)
  const device = store.devices.find((d) => d.id === current.deviceId)
  const mbPerMinute = device?.mbPerMinute ?? 2
  current.mbUsed = +(durMin * mbPerMinute).toFixed(2)
}

function getCurrentSegment(session: Session | null) {
  if (!session || session.segments.length === 0) return null
  const last = session.segments[session.segments.length - 1]
  return last?.endedAt ? null : last
}

export function stopCurrentDeviceAndAutoswitch() {
  const session = store.session
  if (!session) return { session: null, switchedTo: null }

  const current = getCurrentSegment(session)
  if (!current) {
    // Nothing to stop
    return { session, switchedTo: null }
  }

  // Mark current device stopped
  markDeviceStopped(current.deviceId)
  // Close current segment and compute MB used
  closeCurrentSegmentAndComputeMB(session)

  // Switch to another available device if present
  const next = pickAvailableDevice()
  if (next) {
    markDeviceBusy(next.id)
    session.segments.push({
      deviceId: next.id,
      startedAt: now(),
    })
    return { session, switchedTo: next.id }
  }
  // No device available, session remains without active segment
  return { session, switchedTo: null }
}

export function buildSessionSummary() {
  const session = store.session
  const devices = store.devices

  // If there is an active segment, compute live usage for display
  let liveMbUsed = 0
  const current = getCurrentSegment(session)
  if (session && current) {
    const device = devices.find((d) => d.id === current.deviceId)
    const mbPerMinute = device?.mbPerMinute ?? 2
    const durMin = Math.max(0, (now() - current.startedAt) / 60000)
    liveMbUsed = +(durMin * mbPerMinute).toFixed(2)
  }

  const perDevice = new Map<string, { deviceId: string; name: string; durationMin: number; mbUsed: number }>()
  for (const d of devices) {
    perDevice.set(d.id, {
      deviceId: d.id,
      name: d.name,
      durationMin: 0,
      mbUsed: 0,
    })
  }

  if (session) {
    for (const seg of session.segments) {
      const dev = devices.find((d) => d.id === seg.deviceId)
      const mbPerMinute = dev?.mbPerMinute ?? 2
      const end = seg.endedAt ?? now()
      const durMin = Math.max(0, (end - seg.startedAt) / 60000)
      const mb = seg.mbUsed ?? +(durMin * mbPerMinute).toFixed(2)
      const rec = perDevice.get(seg.deviceId)!
      rec.durationMin += durMin
      rec.mbUsed += mb
    }
  }

  const perDeviceArr = Array.from(perDevice.values()).filter((x) => x.durationMin > 0 || x.mbUsed > 0)

  const totalDurationMin = perDeviceArr.reduce((a, b) => a + b.durationMin, 0)
  const totalMb = perDeviceArr.reduce((a, b) => a + b.mbUsed, 0)

  return {
    devices,
    session,
    summary: {
      currentDeviceId: current?.deviceId ?? null,
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
