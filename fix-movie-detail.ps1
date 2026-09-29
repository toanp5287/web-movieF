$path = 'D:\movieF\vite-project\src\pages\movie-detail.html'
$raw = [System.IO.File]::ReadAllText($path)

$pairs = @(
  @('AB6AXuDeWGYl7ORt_8nQC2EZl_68RLR-gud9pN1IVzOHlQ-Y4TmYpcZmK0PcyyfziT_ZPmTWcGs69_soKBKJCPu__ykZ_ryFDNUeJy12Y8yThOAKsT3Q7n4EVR3-7_kNryrAbqNl3Obma1EcjlSPVqLlA3briFLLgOtMgn4FrZPPj8LS2LT1oW4FIJpWuiCxfFvFOMqK4mhcayNzjeb4iipNQWmCxaXkerE21EEqPBFIUB2ajy2MgDtsLidx', '/images/avatar/default.svg'),
  @('AB6AXuDwl3EPJlzCZaEgcfuuVzM0EPnszoG0TBoGpJaNLCMmlvY-oXufDRxztgKVmJIHpEkgrcs-Joq0XkkPvWw5YPwfVJNj5CVhWLX4fsZm-JOf9eeHGuANDLBHPTox4BZVBbrwzqLCy-_PsryQrtthcy658qArMYjhZywEJNqn4HdPD4ZgFIJ_octjmLUS1Y97vWekUfcGby4UPY3PLkKMtGVWWNX6JUoekrzZh9yVamCAx-EqLd5gmXom', '/images/backgrounds/movie-backdrop.jpg'),
  @('AB6AXuBHJzxcKXmT-mJRxFm1pbJdK0wqaJRuaL7pZvui7ZVlr7fUjQeiYp92A-vV2iQR6ksJyilWairm_rMpEt4pBrtZt2AH0e9y67WVFEUHgIEPM0zPD8gNKAId6BodXQVQSV61zJgCDIXHIelHR0bhgQo5MPwjJwkNuIn6hTVf-xDuCOZv6nzYMg_qjy2EYE6kSVT_NIXNV0AVUDtzUNJ_xLbILirApEltPMXIHtjJ-JXIiNSkdIhE2d-E', '/images/movies/dune-poster.jpg'),
  @('AB6AXuB7e6JU1wHJAnSXF48ryYZt_PpexBKz_ySWCH6HFk7MYDzSKbEBX36m4D_rPQrHqFBICMMQZEcn2pRNNlkBvKPsqnvIJ-UxY5CT3FMXITnOzV55sQ-BM5DLdKFKQJ2ocIfzPRznMaQBFeZB2sYyL4s6M7kPIJB5e2ynYjTcZjmeqlNck0jsgPWrO2O-InqujPKeTjvq4cKDhQHFl1DaC8uLq8Ol1Ij2wDNNIQcFn4zdbTo_0ooMy-g5', '/images/actors/chalamet.jpg'),
  @('AB6AXuD5--V8OnRsUVCHBGR-LosG8G25rptqxoiTBBRaflllLs4k88Lt8mqPOOYe0FfztVbbybpIqu7ayS7Fr0KfpefdMHLpWex9OscFPddZT9Yye-qq-ccgbYmNoh4_daA3XuqIaEstYR2EyWiv1Hm04s0oc51c7UPdgZZovcR5JYcxUpVwQ2vWylbeFHUVsSV9eUGYmF8MPH4eIEen9qqYrkt0EfWQ_Zos6qHuHYkhKBL2knPuwN2OIqRd', '/images/actors/zendaya.jpg'),
  @('AB6AXuDUV83mFxikxU4lQdXGdvkHEwmoI5qLAYTe0oX4BtF6rHLwPNUxJGv4kCjWZE-pm5A4nVfrieEUgA7oJCtQ1smprMmkNFg6QZdlqA-Voipis4iPHFs4RNo-5Il4tY6TAk3TFnwlJSmqa8reASxc2ET7pv-RbkeVDl-CDfZ2KSr1dAiZqOacwhtP7XUbmE1skSpupOUrnkB5QF_ka6hsos6-xgiP8AckrkrXuBOX2Y0JeiF6cadpRJHX', '/images/actors/ferguson.jpg'),
  @('AB6AXuBHh1A8Ubd_P9AJFCf8kG0PpGZ0A21ohuJQcmT2_Bdbc99AP-luzypT8b_aB9pxYoGcq7K5jgFGlgPvDj33o3zo-kmlQGpeshY0ccb0HENSEfBPrtMitOiV0OdGiMwQR_AOAIUluGoQXtx3VtfpymG2CBfJ9VWPUjEjUpp4k0xnRcAp8w5K2rLHVGcig9ausgQBtxpdaGdv-eWe1eB5oUIKkj8I0h3RX0SXrE5y6d8BPEIM_5lq4TsI', '/images/actors/bardem.jpg'),
  @('AB6AXuCIL_Q2D1AvgoNdZgKVG2bWZSDQaKkQz5XCV3wvBxInhouCSkC1TwhPd_pkqWLOsUZr1sudrLKoWktmGvyBqDqmgN2hBdxCXgdfzGraadTyu358QfOHg3k838sGntTSiJuyrOWQGBC1tUwZk-lil0rP0o5NEFUBlHMtqZnuYyZYqurpelsF5UzviTq3QJhILQt5tEkgVwdTK1apr-krMaAZUwtF-zyh4HFi0eHs_E9g11m9Q1l_lSO8', '/images/actors/butler.jpg'),
  @('AB6AXuDeyl252-nyGIfjyZdfVKVmfZSmeIhZhvDuVzdNtu-0eUVHCoxqkP-gIM8jvew5NzVjop70Zo57DEAKD9cw9hjD3pIaTmh-z9V7_XchBgEgIywMpTxiMmhyZinNOJpcC_LUboiaKoh3P3uWu3JyUj73y0-mN--RDvRk8Xu9PSTITdihxAjjBQzpqlMNyObahZ6hl7b-vpmLtUW45JdPxgIZmZdP2uz_On4GggKQ0bgbhXoKh36SDR26', '/images/actors/villeneuve.jpg'),
  @('AB6AXuBpYW7uSLilSumF1PdbDApIGsMpfJAoGGPhbnT3zd1C8LhgL_bP61Qb3XpeosM0NzhBtuk2Uaq38trMHsRFX5TjPO_d6GGWOcdUEXWRkbj_5Y5-deZ1pIqG1gRisIHlhuToONyhBSwL20EUlNBJxlDGB4bxCl9pYTCuV8QS0h7NL-VeekIwyHkrzPNNrT49HUqcIaStLC3UoyPt7dKmJHirEa1ip05qf6hNJi2zQzoIOw0DYbIdSkU7', '/images/avatar/avatar-1.jpg'),
  @('AB6AXuBjG3GjBDFUKPKvTyGY5A7L66lncXIHOmiKPlPhIDIEG8LuJQSWBJM-MxZF_TRuLTIKaaFqQCy-75q2D73loqBWrSeJop5WYvL-3fad_sC1wp9Subq4l2EZjFm5awHtuBUQkKp0yx3H3fh71DNwV8l4ZTa8KZtgvhyenXOcUdIHcpnThu1e8Lf7yeyuVjiyqvP93NlTA9k9c4vz3ZMK76Y3nwxTxXMCwAt00E3gED8KuNMbI--ZBPIF', '/images/avatar/avatar-2.jpg'),
  @('AB6AXuD7j8SgTI4NTPrn3NkTFHmOByqojLaGKEl9FowFU14UFuaMrX28VVoHv3qNyTy90VqCOoKPMD_iQJ-M3QAJtdr4Or1GoUhjLEJ90D0d7DVSyVCc_Zv-FCx_bAS1m-5youWYMT1IAgJW4njM5Y3YFTpeVNkGGR32-OtZS-QhyDdgWCKWnk0ztyXt8fQons4sf_t4gipPvHkdLAB0ecaezSNNj0pFnHsDIfV4CPITXfnlC27icYzqNOg0', '/images/avatar/avatar-3.jpg'),
  @('AB6AXuAwDaJ6hUjp2QGHGcnPYxac-o0RSH2a0zKc4mH5swcYd09PaP5pfnFKdak6x6m_yFDlriWlvvkCmrI0dsrY-bYkMw3MpCMkrOQSv2mge8z7L6wZ2K0NEFUv8fC5-3s9edC3YILhSUdkKZcgiMcczaCrTYPDk6UkkmK3cG4cjjaGolZvK8AEJZrxW3iQAfiaGxeZx4_WBsHPCbNTZ7t3pMcAjwWc2F0G09WXp75WsikrUbM6gIhOGfuC', '/images/movies/interstellar.jpg'),
  @('AB6AXuD_P3E1xybPa7xUufaWiDXmsuiTXaCyw4woso5_UHlXlY7RLUK9ZwDVPCQPIr7x6R4de_8Ws-_cD-TBzh6JujPe9_-8RbFZW0-VAnkTr8rCkMgbWrtAKKa07vmTRH9eHTtLR7AfK4sigklqWz9QWCcdztw4pAFbuuHE95IVy3ABSpIESYYn3Zlfyn2UM5gcm4JWm0OqLLch0ih_3QoDilW6X2RUxxJBMH3m5ep6aDz6Swk0eVfkFjL7', '/images/movies/blade-runner-2049.jpg'),
  @('AB6AXuA2N-O6T3ilCdxgmjloFt8tR_vfB0TYcX7J3lMExt2SkXIsxpn33Wv6bGX5dZuZP1Ns0e9jmeyvW4FcHdoOjteSkVPDLZdHsZAKdK5dEsdoim5ku1RA72coj3hD9HhGzXZiWiP-GxBjzBnVXuSJrlVK2ufuLWwJAeWC1xRo1W-1OBoZwvLlCuogJZsGihlbfFBrQwE8zWtR5fvtDIMoJbpJ7bwTH2_wuGPheMIJVvVjSchU4S5JxTM5', '/images/movies/matrix.jpg'),
  @('AB6AXuD7D-ApRn3gkKzdv8dn8PldbyKtDhI6n6i_46gQRTEDd3B9u1PYFdBmqkchRQ3ORQTupLJG_yX_6KzMaFGcskpND6xCy-T4X3tRzALXpHhyDRGUmTRaWhRw4L_Z_8YhX3YEFTsjMUI3ikd-qK57toY8TFmISrjuQEn_3rZKeey3x-hc0zrq3CgbYIf2WLMfwQbDA8B7IQREW4oHd6oUhbpM_g5HXuv7I6Ft5xzwPYXwfTXGj3pSmVQX', '/images/movies/arrival.jpg'),
  @('AB6AXuC37UNNFnF3gFyial1VWhXzKX4SIYDVoBasHnk3Ud-xCylsXwO-DDhkqdK-9N3h8M0x5ylPWbddf2LXXm0pISmjdsI2BSnV6h9bNbALzjLDKITqp3Chx_EZeqUznHVQ1-AiACtAR14vnOpEHPRC4QJWZIbvO0Q8Rmpab_3Uew-ZCLmrgkW8tcEvLwUUe0WovboGGQAM_50bEjjQake9R7QLV98oI7wgbGavAMqA7QVT4GrTsuuu1vaw', '/images/movies/dune-poster.jpg')
)

$total = 0
foreach ($p in $pairs) {
  $oldUrl = 'https://lh3.googleusercontent.com/aida-public/' + $p[0]
  $n = $raw.Split([string[]]@($oldUrl), [System.StringSplitOptions]::None).Length - 1
  $total += $n
  $raw = $raw.Replace($oldUrl, $p[1])
  "{0,-12} x{1} -> {2}" -f ($p[1] -split '/')[-1], $n, $p[1]
}
[System.IO.File]::WriteAllText($path, $raw)
"TOTAL replaced: $total"