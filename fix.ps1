$utf8 = New-Object System.Text.UTF8Encoding($false)
$content = @'
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
'@
[System.IO.File]::WriteAllText("src\lib\supabase\client.ts", $content, $utf8)
Write-Host "Done"
