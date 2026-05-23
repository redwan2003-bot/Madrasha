# Upload deploy/sfdm-upload/export_for_supabase.php to sfdm.xyz via FTP.
# Requires deploy/.ftp.env (see deploy/.ftp.env.example).

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$EnvFile = Join-Path $Root "deploy\.ftp.env"
$LocalFile = Join-Path $Root "deploy\sfdm-upload\export_for_supabase.php"

if (-not (Test-Path $EnvFile)) {
    Write-Error "Missing $EnvFile — copy deploy/.ftp.env.example to deploy/.ftp.env and fill FTP_HOST, FTP_USER, FTP_PASS."
}
if (-not (Test-Path $LocalFile)) {
    Write-Error "Missing $LocalFile"
}

$vars = @{}
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $vars[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim()
}

foreach ($key in @("FTP_HOST", "FTP_USER", "FTP_PASS", "FTP_REMOTE_PATH")) {
    if (-not $vars[$key]) {
        Write-Error "deploy/.ftp.env must set $key"
    }
}

$host = $vars["FTP_HOST"] -replace "^ftp://", "" -replace "/$", ""
$remote = $vars["FTP_REMOTE_PATH"].TrimStart("/")
$url = "ftp://${host}/${remote}"
$user = $vars["FTP_USER"]
$pass = $vars["FTP_PASS"]

Write-Host "Uploading to $url ..."
$curlOut = & curl.exe -sS --ftp-pasv --max-time 120 -T $LocalFile $url --user "${user}:${pass}" -w "`nHTTP_CODE:%{http_code}" 2>&1
$code = $null
if ($curlOut -match "HTTP_CODE:(\d+)") { $code = $Matches[1] }
if ($LASTEXITCODE -ne 0) {
    Write-Error "curl failed (exit $LASTEXITCODE): $curlOut"
}

Write-Host "Upload finished. Test:"
Write-Host "  https://sfdm.xyz/api/export_for_supabase.php?import_secret=madrasha-supabase-import"
Write-Host "Then: cd web && npm run import:legacy"
