# Script automatizado para publicar GitHub Release v1.1.0 con los binarios oficiales
Write-Host "Verificando inicio de sesión en GitHub CLI..." -ForegroundColor Cyan

$tag = "v1.1.0"
$title = "Galaxy Dust Online v1.1.0"
$notes = "Release oficial v1.1.0 de Galaxy Dust Online con optimizaciones de red, intro cinemática y cliente nativo multiplataforma (Windows y Android)."
$exeAsset = "src-tauri\target\release\bundle\nsis\GalaxyDust_1.1.0_x64-setup.exe"
$apkAsset = "GalaxyDust_1.1.0.apk"

if (-not (Test-Path $exeAsset)) {
    Write-Error "No se encontró el instalador de Windows: $exeAsset"
    exit 1
}

if (-not (Test-Path $apkAsset)) {
    Write-Error "No se encontró el APK de Android: $apkAsset"
    exit 1
}

Write-Host "Subiendo assets a GitHub Release $tag..." -ForegroundColor Green
gh release create $tag $exeAsset $apkAsset --title $title --notes $notes

if ($LASTEXITCODE -eq 0) {
    Write-Host "Release $tag publicado con éxito!" -ForegroundColor Green
} else {
    Write-Host "Si falta autenticación, ejecuta 'gh auth login' en la terminal y luego vuelve a ejecutar este script." -ForegroundColor Yellow
}
