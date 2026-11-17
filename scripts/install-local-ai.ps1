$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
New-Item -ItemType Directory -Path '.runtime' -Force | Out-Null
$ollamaCommand = Get-Command ollama -ErrorAction SilentlyContinue
$ollamaExecutable = if ($ollamaCommand) { $ollamaCommand.Source } else { Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe' }
if (-not (Test-Path -LiteralPath $ollamaExecutable)) {
    $installer = Join-Path (Get-Location) '.runtime\OllamaSetup.exe'
    Invoke-WebRequest 'https://ollama.com/download/OllamaSetup.exe' -OutFile $installer
    $signature = Get-AuthenticodeSignature -LiteralPath $installer
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Ollama Inc\.') { throw 'Ollama installer signature did not match.' }
    $installProcess = Start-Process -FilePath $installer -ArgumentList @('/VERYSILENT','/NORESTART','/SUPPRESSMSGBOXES') -WindowStyle Hidden -PassThru
    $installProcess.WaitForExit()
    if ($installProcess.ExitCode -ne 0) { throw 'Ollama installation failed.' }
}
try { Invoke-RestMethod 'http://localhost:11434/api/tags' -TimeoutSec 3 | Out-Null }
catch { Start-Process -FilePath $ollamaExecutable -ArgumentList @('serve') -WindowStyle Hidden -RedirectStandardOutput '.runtime/ollama.log' -RedirectStandardError '.runtime/ollama-error.log' | Out-Null; Start-Sleep -Seconds 3 }
$ramGB = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB
$modelName = if ($ramGB -ge 28) { 'qwen3:14b' } elseif ($ramGB -ge 20) { 'qwen3:8b' } elseif ($ramGB -ge 12) { 'qwen3:4b-instruct' } elseif ($ramGB -ge 7) { 'qwen3:1.7b' } else { 'qwen3:0.6b' }
& $ollamaExecutable pull $modelName
if ($LASTEXITCODE -ne 0) { throw 'Model download failed. Run this script again to resume.' }
Write-Output "Local Ollama is ready with $modelName. No paid AI provider is used."
