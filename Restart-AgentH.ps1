$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
Set-Location -LiteralPath $projectRoot
foreach ($service in @('web', 'worker')) {
    $pidFile = Join-Path $projectRoot ".runtime/$service.pid"
    if (-not (Test-Path -LiteralPath $pidFile)) { continue }
    $serviceId = [int](Get-Content -LiteralPath $pidFile -Raw)
    $serviceProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$serviceId"
    if ($null -eq $serviceProcess) { continue }
    if ($serviceProcess.CommandLine -notmatch [Regex]::Escape($projectRoot) -or $serviceProcess.CommandLine -notmatch 'next.*start|worker.ts') {
        throw "Refusing to stop a process outside this AgentH workspace. Close this app's server manually, then run Start-AgentH.ps1."
    }
    Stop-Process -Id $serviceId
}
& (Join-Path $projectRoot 'Start-AgentH.ps1')
