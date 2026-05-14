$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$path = "src\proxy.ts"
$bytes = [System.IO.File]::ReadAllBytes($path)
if ($bytes[1] -eq 0x00 -and $bytes[3] -eq 0x00) {
    $c = [System.Text.Encoding]::Unicode.GetString($bytes)
} elseif ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
    $c = [System.Text.Encoding]::Unicode.GetString($bytes, 2, $bytes.Length - 2)
} else {
    $lenient = New-Object System.Text.UTF8Encoding($false, $false)
    $c = $lenient.GetString($bytes)
}
$c = $c.Replace("export async function middleware(", "export async function proxy(")
[System.IO.File]::WriteAllText($path, $c, $utf8NoBom)
Write-Host "Done"
