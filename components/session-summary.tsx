"use client"

import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type SummaryResponse = {
  summary: {
    currentDeviceId: string | null
    totalDurationMin: number
    totalMb: number
    perDevice: { deviceId: string; name: string; durationMin: number; mbUsed: number }[]
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function SessionSummary() {
  const { data } = useSWR<SummaryResponse>("/api/session", fetcher, { refreshInterval: 1000 })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pretty">Session Summary</CardTitle>
        <CardDescription>Devices, durations, and rough data used.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="text-sm">
          <div>
            <span className="font-medium">Total duration:</span> {data?.summary.totalDurationMin?.toFixed(2) ?? "0.00"}{" "}
            min
          </div>
          <div>
            <span className="font-medium">Total data used:</span> {data?.summary.totalMb?.toFixed(2) ?? "0.00"} MB
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr className="border-b">
                <th className="py-2 pr-4">Device</th>
                <th className="py-2 pr-4">Duration (min)</th>
                <th className="py-2 pr-4">Data Used (MB)</th>
              </tr>
            </thead>
            <tbody>
              {data?.summary.perDevice?.length ? (
                data.summary.perDevice.map((row) => (
                  <tr key={row.deviceId} className="border-b last:border-0">
                    <td className="py-2 pr-4">{row.name}</td>
                    <td className="py-2 pr-4">{row.durationMin.toFixed(2)}</td>
                    <td className="py-2 pr-4">{row.mbUsed.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-2 pr-4 text-muted-foreground" colSpan={3}>
                    No data yet. Start a session to see usage.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
