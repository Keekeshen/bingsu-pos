$utf8 = New-Object System.Text.UTF8Encoding($false)
$base = Split-Path -Parent $MyInvocation.MyCommand.Path

$routeSrc  = Join-Path $base "route-new.txt"
$cartSrc   = Join-Path $base "cart-new.txt"
$routeDest = Join-Path $base "src\app\api\checkout\route.ts"
$cartDest  = Join-Path $base "src\components\admin\CheckoutCart.tsx"

$routeContent = [System.IO.File]::ReadAllText($routeSrc, [System.Text.Encoding]::Unicode)
[System.IO.File]::WriteAllText($routeDest, $routeContent, $utf8)
Write-Host "route.ts written as UTF-8"

$cartContent = [System.IO.File]::ReadAllText($cartSrc, [System.Text.Encoding]::Unicode)
[System.IO.File]::WriteAllText($cartDest, $cartContent, $utf8)
Write-Host "CheckoutCart.tsx written as UTF-8"

Remove-Item $routeSrc, $cartSrc
Write-Host "Done"
