# Script automatizado para publicar GitHub Release v1.1.4 con los binarios oficiales
Write-Host "Verificando inicio de sesión en GitHub CLI..." -ForegroundColor Cyan

$version = "1.1.4"
$tag = "v1.1.4"
$title = "Galaxy Dust Online v1.1.4"
$notes = "Release oficial v1.1.4 de Galaxy Dust Online con autorización de Cloudflare R2 en Tauri CSP, soporte ampliado de assets y sincronización de versión cliente multiplataforma (Windows y Android)."

# Rutas de los binarios oficiales
$exeAsset = "src-tauri\target\release\bundle\nsis\GalaxyDust_${version}_x64-setup.exe"
$sigAsset = "src-tauri\target\release\bundle\nsis\GalaxyDust_${version}_x64-setup.exe.sig"
$apkAsset = "GalaxyDust_${version}.apk"
$latestJson = "latest.json"

# 1. Verificación del instalador de Windows (.exe)
if (-not (Test-Path $exeAsset)) {
    $altExe = Get-ChildItem -Path "src-tauri\target\release\bundle\nsis" -Filter "*${version}*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($altExe) {
        $exeAsset = $altExe.FullName
    } else {
        Write-Error "No se encontró el instalador de Windows: $exeAsset"
        Write-Host "Verifica que el ejecutable esté compilado en src-tauri o tenga el número $version en su nombre." -ForegroundColor Yellow
        exit 1
    }
}

# 2. Verificación del paquete de Android (.apk)
if (-not (Test-Path $apkAsset)) {
    $altApk = Get-ChildItem -Filter "*${version}*.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($altApk) {
        $apkAsset = $altApk.Name
    } else {
        Write-Error "No se encontró el APK de Android: $apkAsset"
        Write-Host "Asegúrate de tener el archivo GalaxyDust_${version}.apk en la raíz del proyecto." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Assets detectados para distribución:" -ForegroundColor Cyan
Write-Host "  -> Windows : $exeAsset" -ForegroundColor Gray
Write-Host "  -> Android : $apkAsset" -ForegroundColor Gray

# Preparar lista de assets para la Release
$assetsToUpload = @($exeAsset, $apkAsset)
if (Test-Path $sigAsset) {
    Write-Host "  -> Signature : $sigAsset" -ForegroundColor Gray
    $assetsToUpload += $sigAsset
}
if (Test-Path $latestJson) {
    Write-Host "  -> Updater : $latestJson" -ForegroundColor Gray
    $assetsToUpload += $latestJson
}

Write-Host "Subiendo release $tag a GitHub..." -ForegroundColor Green
gh release create $tag $assetsToUpload --title $title --notes $notes

if ($LASTEXITCODE -eq 0) {
    Write-Host "¡Release $tag publicado con éxito en GitHub Releases!" -ForegroundColor Green
} else {
    Write-Host "Ocurrió un error. Si es un fallo de permisos, ejecuta 'gh auth login' en la terminal y reintenta." -ForegroundColor Yellow
}