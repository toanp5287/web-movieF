$root = 'D:\movieF\vite-project'
$files = @(
  'src\admin\booking.html','src\admin\genres.html','src\admin\movies.html','src\admin\users.html',
  'src\assets\pages\home.html','src\assets\pages\movies.html','src\assets\pages\watch.html',
  'src\pages\favorite.html','src\pages\genres.html','src\pages\movies.html','src\pages\profile.html','src\pages\watch.html'
)
$out = New-Object System.Text.StringBuilder
foreach ($f in $files) {
  $full = Join-Path $root $f
  $lines = [System.IO.File]::ReadAllLines($full)
  [void]$out.AppendLine("########## $f ##########")
  for ($n = 0; $n -lt $lines.Count; $n++) {
    if ($lines[$n] -match 'lh3\.googleusercontent\.com') {
      $start = [Math]::Max(0, $n - 6); $end = [Math]::Min($lines.Count - 1, $n)
      [void]$out.AppendLine("--- line $($n+1) ---")
      for ($m = $start; $m -le $end; $m++) {
        $t = $lines[$m].Trim()
        if ($t -match 'lh3\.googleusercontent\.com') {
          $id = [regex]::Match($t, '[A-Za-z0-9_\-]{25,}').Value
          $t = $t -replace 'https://lh3\.googleusercontent\.com/[A-Za-z0-9_\-/]+/[A-Za-z0-9_\-]{25,}', "URL=$($id.Substring(0,[Math]::Min(30,$id.Length)))"
        }
        [void]$out.AppendLine("$($m+1): $t")
      }
    }
  }
}
[System.IO.File]::WriteAllText((Join-Path $env:TEMP 'img-report.txt'), $out.ToString())
"report written: $($out.Length) chars"