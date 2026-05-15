$utf8 = [System.Text.UTF8Encoding]::new($false)
$enc  = [System.Text.Encoding]::Unicode
$base = "C:\Users\keeke\bingsu-pos"

$c = [System.IO.File]::ReadAllText("$base\rf2\receipt.txt", $enc)
[System.IO.File]::WriteAllText("$base\src\components\admin\ReceiptPrint.tsx", $c, $utf8)
Write-Host "OK: ReceiptPrint.tsx"

Remove-Item "$base\rf2" -Recurse -Force
Write-Host "Done"
