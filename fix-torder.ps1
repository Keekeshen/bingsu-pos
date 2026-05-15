$utf8 = [System.Text.UTF8Encoding]::new($false)
$c = [System.IO.File]::ReadAllText("C:\Users\keeke\bingsu-pos\tfix\table-order.txt", [System.Text.Encoding]::Unicode)
[System.IO.File]::WriteAllText("C:\Users\keeke\bingsu-pos\src\app\api\table-order\route.ts", $c, $utf8)
Remove-Item "C:\Users\keeke\bingsu-pos\tfix" -Recurse -Force
Write-Host "Done"
