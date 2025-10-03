"use client"

import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

type SummaryResponse = {
  session: {
    id: string
    startedAt: number
    endedAt?: number
    segments: { deviceId: string; startedAt: number; endedAt?: number; mbUsed?: number }[]
  } | null
  devices: { id: string; name: string; status: "available" | "busy" | "stopped"; mbPerMinute: number }[]
  summary: {
    currentDeviceId: string | null
    totalDurationMin: number
    totalMb: number
    liveMbUsed: number
    perDevice: { deviceId: string; name: string; durationMin: number; mbUsed: number }[]
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function SessionControls() {
  const { data, mutate, isLoading } = useSWR<SummaryResponse>("/api/session", fetcher, {
    refreshInterval: 1000,
  })

  async function startSession() {
    await fetch("/api/session/start", { method: "POST" })
    mutate()
  }

  async function stopDevice() {
    await fetch("/api/device/stop", { method: "POST" })
    mutate()
  }

  async function resetDemo() {
    await fetch("/api/reset", { method: "POST" })
    mutate()
  }

  const currentDevice = data?.devices.find((d) => d.id === data?.summary.currentDeviceId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pretty">Session Controller</CardTitle>
        <CardDescription>Start a session, stop the current device to auto-switch, and reset the demo.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={startSession} variant="default" disabled={isLoading}>
            Start Session
          </Button>
          <Button onClick={stopDevice} variant="secondary" disabled={isLoading}>
            Stop Current Device
          </Button>
          <Button onClick={resetDemo} variant="outline" disabled={isLoading}>
            Reset Demo
          </Button>
        </div>

        <div className="text-sm">
          <div>
            <span className="font-medium">Current Device: </span>
            {currentDevice ? `${currentDevice.name} (${currentDevice.status})` : "None"}
          </div>
          <div className="text-muted-foreground">
            Total time: {data?.summary.totalDurationMin?.toFixed(2) ?? "0.00"} min · Data used:{" "}
            {data?.summary.totalMb?.toFixed(2) ?? "0.00"} MB
          </div>
        </div>

        <div className="text-sm">
          <span className="font-medium">Devices:</span>
          <ul className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
            {data?.devices.map((d) => (
              <li key={d.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      <Link href={`/devices/${d.id}`} className="underline underline-offset-2">
                        {d.name}
                      </Link>
                    </div>
                    <div className="text-muted-foreground">Status: {d.status}</div>
                    <div className="text-muted-foreground">~{d.mbPerMinute} MB/min</div>
                  </div>
                  <Link
                    href={`/devices/${d.id}`}
                    className="text-sm font-medium text-foreground hover:opacity-80"
                    aria-label={`View ${d.name} profile`}
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
