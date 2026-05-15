$utf8 = [System.Text.UTF8Encoding]::new($false)
$enc  = [System.Text.Encoding]::Unicode
$base = "C:\Users\keeke\bingsu-pos"
$tf   = "$base\tf"

function Write-Ts($src, $rel) {
  $dest = "$base\$rel"
  $dir  = Split-Path $dest -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $content = [System.IO.File]::ReadAllText("$tf\$src", $enc)
  [System.IO.File]::WriteAllText($dest, $content, $utf8)
  Write-Host "OK: $rel"
}

Write-Ts "menu-api.txt"           "src\app\api\menu\route.ts"
Write-Ts "table-order-api.txt"    "src\app\api\table-order\route.ts"
Write-Ts "order-page.txt"         "src\app\order\[tableNumber]\page.tsx"
Write-Ts "tables-admin.txt"       "src\app\(admin)\admin\tables\page.tsx"
Write-Ts "table-grid.txt"         "src\components\admin\TableGrid.tsx"
Write-Ts "table-order-view.txt"   "src\components\admin\TableOrderView.tsx"
Write-Ts "pos-new.txt"            "src\app\(admin)\admin\pos\page.tsx"
Write-Ts "admin-layout-new.txt"   "src\app\(admin)\layout.tsx"

Remove-Item "$tf" -Recurse -Force
Write-Host "Done - all files written as UTF-8"
