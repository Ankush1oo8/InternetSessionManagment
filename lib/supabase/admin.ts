import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Use the service role key on the server only (never expose to the client)
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Component call: safe to ignore since we don't need to set cookies in this app
          }
        },
      },
    },
  )
}
