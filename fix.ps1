$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$clientTs = @"
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
let _client: ReturnType<typeof createSupabaseClient> | null = null;
export function createClient() {
  if (typeof window === "undefined") {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  if (!_client) {
    _client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
"@
[System.IO.File]::WriteAllText("src\lib\supabase\client.ts", $clientTs, $utf8NoBom)
Write-Host "Done"
