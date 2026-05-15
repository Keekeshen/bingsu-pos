$utf8 = [System.Text.UTF8Encoding]::new($false)
$enc  = [System.Text.Encoding]::Unicode
$base = "C:\Users\keeke\bingsu-pos"
$rf   = "$base\rf"

function W($src, $rel) {
  $dest = "$base\$rel"
  $dir  = Split-Path $dest -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $c = [System.IO.File]::ReadAllText("$rf\$src", $enc)
  [System.IO.File]::WriteAllText($dest, $c, $utf8)
  Write-Host "OK: $rel"
}

W "receipt.txt"        "src\components\admin\ReceiptPrint.tsx"
W "order-page-v2.txt"  "src\app\order\[tableNumber]\page.tsx"

Remove-Item "$rf" -Recurse -Force
Write-Host "Done"
