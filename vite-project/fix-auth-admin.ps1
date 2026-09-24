$root = 'D:\movieF\vite-project'

function Replace-AllIn($file, $old, $new) {
  $full = Join-Path $root $file
  if (-not (Test-Path -LiteralPath $full)) { "SKIP (missing) $file"; return }
  $raw = [System.IO.File]::ReadAllText($full)
  $n = $raw.Split([string[]]@($old), [System.StringSplitOptions]::None).Length - 1
  if ($n -gt 0) {
    $raw = $raw.Replace($old, $new)
    [System.IO.File]::WriteAllText($full, $raw)
    "{0} : x{1} {2}" -f $file, $n, ($new -split '/')[-1]
  }
}

# --- Login / Register backdrops (+ their src/assets duplicates) ---
foreach ($f in @('src\pages\login.html','src\pages\register.html','src\assets\pages\login.html','src\assets\pages\register.html')) {
  $full = Join-Path $root $f
  foreach ($m in [regex]::Matches([System.IO.File]::ReadAllText($full), 'https://lh3\.googleusercontent\.com/aida-public/[A-Za-z0-9_\-]+')) {
    Replace-AllIn $f $m.Value '/images/backgrounds/movie-backdrop.jpg'
  }
}

# --- Admin index.html ---
$admin = Join-Path $root 'src\admin\index.html'
$raw = [System.IO.File]::ReadAllText($admin)

$logoUrl = 'https://lh3.googleusercontent.com/aida/AEtjO1VeksytFg1dn6T9F3hPib7wbqtn3ygRp3PC8eEkZpRpmkwjknjnvQXLWLxZTQNnjUZqNQ3FCl8AZchSrDB7iioiDn3HOaFoI1H32feVlzd6_Vl0vNBFIBtETqTO4lebdMKng4UNbMkPi1QxUgTpps6UP17GbgneT_zod4YvYbWWzIoeEsrzIKSWmC0CT4WiOZtC-uLO1btCMOg3198iZj4kHr_g_Rw4D2QAOBZi5j4ptMp_ug2BY9swUg'
$raw = $raw.Replace($logoUrl, '/images/logo/logo.svg')

$ids = [regex]::Matches($raw, 'https://lh3\.googleusercontent\.com/aida-public/[A-Za-z0-9_\-]+') | ForEach-Object { $_.Value }
"admin index: $($ids.Count) distinct aida-public url instances"

$avatar = $ids[0]
$banner = $ids[1]
$raw = $raw.Replace($avatar, '/images/avatar/admin.svg')
$raw = $raw.Replace($banner, '/images/backgrounds/movie-backdrop.jpg')

$posters = @(
  'admin-dune-cat-2.jpg','admin-vong-dat-cam-lang.jpg','admin-chien-binh-mua-dong.jpg','admin-mat-vu-bong-dem.jpg',
  'admin-ky-sinh-trung.jpg','admin-ke-trom-ky-uc.jpg','admin-tho-san-man-dem.jpg','admin-an-mang-tang-13.jpg',
  'admin-thanh-pho-vo-toi.jpg','admin-nguoi-gia-ma.jpg','admin-ao-anh-cuoi-cung.jpg','admin-ke-trung-phat-tai-thuong.jpg',
  'admin-vuc-tham-vo-cuc.jpg','admin-biet-doi-dot-kich.jpg','admin-bi-an-dao-dau-lau.jpg','admin-hai-chuong-tu-than.jpg'
)
for ($i = 2; $i -lt $ids.Count; $i++) {
  $raw = $raw.Replace($ids[$i], '/images/movies/' + $posters[$i-2])
}
[System.IO.File]::WriteAllText($admin, $raw)
"admin index: done"

"remaining aida admin: $(([regex]::Matches([System.IO.File]::ReadAllText($admin),'lh3\.googleusercontent\.com')).Count)"
"remaining aida login: $(([regex]::Matches([System.IO.File]::ReadAllText((Join-Path $root 'src\pages\login.html')),'lh3\.googleusercontent\.com')).Count)"
"remaining aida register: $(([regex]::Matches([System.IO.File]::ReadAllText((Join-Path $root 'src\pages\register.html')),'lh3\.googleusercontent\.com')).Count)"