# Script automatizado para publicar GitHub Release v1.1.2 con los binarios oficiales
Write-Host "Verificando inicio de sesión en GitHub CLI..." -ForegroundColor Cyan

$version = "1.1.2"
$tag = "v1.1.2"
$title = "Galaxy Dust Online v1.1.2"
$notes = "Release oficial v1.1.2 de Galaxy Dust Online con parches de seguridad RLS en base de datos, corrección del flujo de restablecimiento de contraseñas y sincronización de versión cliente multiplataforma (Windows y Android)."

# Rutas de los binarios oficiales
$exeAsset = "src-tauri\target\release\bundle\nsis\GalaxyDust_${version}_x64-setup.exe"
$apkAsset = "GalaxyDust_${version}.apk"
$latestJson = "latest.json"

# 1. Verificación del instalador de Windows (.exe)
if (-not (Test-Path $exeAsset)) {
    $altExe = Get-ChildItem -Path "src-tauri\target\release\bundle\nsis" -Filter "*${version}*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($altExe) {
        $exeAsset = $altExe.FullName
    } else {
        Write-Error "No se encontró el instalador de Windows: $exeAsset"
        Write-Host "Verifica que el ejecutable esté compilado en src-tauri o tenga el número 1.1.2 en su nombre." -ForegroundColor Yellow
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
        Write-Host "Asegúrate de tener el archivo GalaxyDust_1.1.2.apk en la raíz del proyecto." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Assets detectados para distribución:" -ForegroundColor Cyan
Write-Host "  -> Windows : $exeAsset" -ForegroundColor Gray
Write-Host "  -> Android : $apkAsset" -ForegroundColor Gray

# Preparar lista de assets para la Release
$assetsToUpload = @($exeAsset, $apkAsset)
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