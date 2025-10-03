import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDeviceProfile } from "@/lib/db-session"

export default async function DevicePage({ params }: { params: { id: string } }) {
  const data = await getDeviceProfile(params.id)
  if (!data) return notFound()

  const { device, totalsTillNow, lastSession, currentSession } = data

  return (
    <main className="mx-auto max-w-3xl p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-pretty">{device.name}</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:opacity-80" aria-label="Back to dashboard">
          Back
        </Link>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-pretty">Device Overview</CardTitle>
            <CardDescription>Current status and data rate</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <div>
              <span className="font-medium">Status:</span> {device.status}
            </div>
            <div className="text-muted-foreground">Approx. {device.mbPerMinute} MB/min</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-pretty">Totals Till Now</CardTitle>
            <CardDescription>Aggregated usage across all sessions</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <div>
              <span className="font-medium">Total duration:</span> {totalsTillNow.durationMin.toFixed(2)} min
            </div>
            <div>
              <span className="font-medium">Total data used:</span> {totalsTillNow.mbUsed.toFixed(2)} MB
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-pretty">Last Session</CardTitle>
            <CardDescription>Most recent session that used this device</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {lastSession ? (
              <div className="space-y-1">
                <div>
                  <span className="font-medium">Session ID:</span> {lastSession.id}
                </div>
                <div>
                  <span className="font-medium">Started:</span> {new Date(lastSession.startedAt).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Ended:</span>{" "}
                  {lastSession.endedAt ? new Date(lastSession.endedAt).toLocaleString() : "—"}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {lastSession.durationMin.toFixed(2)} min
                </div>
                <div>
                  <span className="font-medium">Data used:</span> {lastSession.mbUsed.toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No prior sessions for this device.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-pretty">Current Session</CardTitle>
            <CardDescription>Live details if this device is active</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {currentSession ? (
              <div className="space-y-1">
                <div>
                  <span className="font-medium">Session ID:</span> {currentSession.sessionId}
                </div>
                <div>
                  <span className="font-medium">Started:</span> {new Date(currentSession.startedAt).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Duration so far:</span> {currentSession.durationSoFarMin.toFixed(2)} min
                </div>
                <div>
                  <span className="font-medium">Estimated data:</span> {currentSession.liveMbUsed.toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">This device is not currently active.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
