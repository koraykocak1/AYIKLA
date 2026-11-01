# Masaustune AYIKLA kisayolu olusturur. Kisayolun ustune bir klasor birakilirsa o klasorle acilir.
$kok = Split-Path -Parent $PSScriptRoot
$electron = Join-Path $kok 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path $electron)) { Write-Error "Electron bulunamadi: $electron"; exit 1 }
$masaustu = [Environment]::GetFolderPath('Desktop')
$yol = Join-Path $masaustu 'AYIKLA.lnk'
$k = (New-Object -ComObject WScript.Shell).CreateShortcut($yol)
$k.TargetPath = $electron
$k.Arguments = '"' + $kok + '"'
$k.WorkingDirectory = $kok
$k.IconLocation = (Join-Path $kok 'simge\ayikla.ico') + ',0'
$k.Description = 'Fotograf ve videolari sahneye ve tarihe gore ayiklar'
$k.Save()
Write-Output "Kisayol olusturuldu: $yol"
