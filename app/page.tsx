import { SessionControls } from "@/components/session-controls"
import { SessionSummary } from "@/components/session-summary"

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-pretty">Device Session Manager</h1>
        <span className="text-sm text-muted-foreground">Demo: auto-switch on stop</span>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SessionControls />
        <SessionSummary />
      </section>

      <section className="text-sm text-muted-foreground">
        Tip: Click “Stop Current Device” to simulate a device failure. The session will automatically switch to the next
        available device, if any.
      </section>
    </main>
  )
}
