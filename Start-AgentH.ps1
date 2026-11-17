$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$nodeExecutable = (Get-Command node).Source
if (-not (Test-Path -LiteralPath 'node_modules/next/package.json')) {
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Package installation failed.' }
}
& node scripts/setup.mjs
function Test-LocalPort([int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try { $client.Connect('127.0.0.1', $Port); return $true }
    catch { return $false }
    finally { $client.Dispose() }
}
$databaseLine = Get-Content -LiteralPath '.env' | Where-Object { $_.StartsWith('DATABASE_URL=') } | Select-Object -First 1
$databaseUri = [Uri]$databaseLine.Substring('DATABASE_URL='.Length)
if ($databaseUri.Host -notin @('localhost', '127.0.0.1')) { throw 'This launcher is for a local database. For hosted PostgreSQL, follow README.md.' }
$databasePort = if ($databaseUri.Port -gt 0) { $databaseUri.Port } else { 5432 }
if (-not (Test-LocalPort $databasePort)) {
    $databaseProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @('scripts/local-db.mjs') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput '.runtime/database.log' -RedirectStandardError '.runtime/database-error.log' -PassThru
    $databaseProcess.Id | Set-Content -LiteralPath '.runtime/database.pid'
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (Test-LocalPort $databasePort) { break }
        Start-Sleep -Seconds 1
    }
    if (-not (Test-LocalPort $databasePort)) { throw 'Database did not start. See .runtime/database-error.log.' }
}
& npm run db:migrate
if ($LASTEXITCODE -ne 0) { throw 'Database schema setup failed; no destructive changes were approved.' }
if (-not (Test-Path -LiteralPath '.next/BUILD_ID')) {
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
}
if (-not (Test-LocalPort 11434)) {
    $portableOllama = Join-Path $projectRoot '.runtime/ollama-cpu/ollama.exe'
    if (Test-Path -LiteralPath $portableOllama) {
        $env:OLLAMA_MODELS = Join-Path $projectRoot '.runtime/ollama-models'
        $env:OLLAMA_NO_CLOUD = '1'
        $env:OLLAMA_NUM_PARALLEL = '1'
        $env:OLLAMA_MAX_LOADED_MODELS = '1'
        $modelProcess = Start-Process -FilePath $portableOllama -ArgumentList @('serve') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput '.runtime/ollama.log' -RedirectStandardError '.runtime/ollama-error.log' -PassThru
        $modelProcess.Id | Set-Content -LiteralPath '.runtime/ollama.pid'
    } else { Write-Output 'Local Ollama setup required: run python scripts/portable-ollama.py --install.' }
}
if (-not (Test-LocalPort 8001)) {
    $speechPython = Join-Path $projectRoot '.runtime/speech-venv/Scripts/python.exe'
    if (Test-Path -LiteralPath $speechPython) {
        $speechProcess = Start-Process -FilePath $speechPython -ArgumentList @('speech/server.py') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput '.runtime/speech.log' -RedirectStandardError '.runtime/speech-error.log' -PassThru
        $speechProcess.Id | Set-Content -LiteralPath '.runtime/speech.pid'
    } else { Write-Output 'Local neural speech setup required; see README.md.' }
}
$workerRunning = $false
if (Test-Path -LiteralPath '.runtime/worker-heartbeat') {
    $lastHeartbeat = [long](Get-Content -LiteralPath '.runtime/worker-heartbeat' -Raw)
    $workerRunning = ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $lastHeartbeat) -lt 20000
    if ($workerRunning) {
        if (Test-Path -LiteralPath '.runtime/worker.pid') {
            $existingWorkerId = [int](Get-Content -LiteralPath '.runtime/worker.pid' -Raw)
            $existingWorker = Get-Process -Id $existingWorkerId -ErrorAction SilentlyContinue
            $workerRunning = $null -ne $existingWorker -and $existingWorker.ProcessName -eq 'node'
        } else { $workerRunning = $false }
    }
}
if (-not $workerRunning) {
    $workerProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @('--import', 'tsx', ('"' + (Join-Path $projectRoot 'src/worker.ts') + '"')) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput '.runtime/worker.log' -RedirectStandardError '.runtime/worker-error.log' -PassThru
    $workerProcess.Id | Set-Content -LiteralPath '.runtime/worker.pid'
}
if (-not (Test-LocalPort 3000)) {
    $webProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @(('"' + (Join-Path $projectRoot 'node_modules/next/dist/bin/next') + '"'), 'start', '--hostname', '127.0.0.1') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput '.runtime/web.log' -RedirectStandardError '.runtime/web-error.log' -PassThru
    $webProcess.Id | Set-Content -LiteralPath '.runtime/web.pid'
}
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
        $page = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing
        if ($page.StatusCode -eq 200 -and $page.Content.Contains('AgentH')) { Write-Output 'AgentH is ready: http://localhost:3000'; exit 0 }
    } catch { }
    Start-Sleep -Seconds 1
}
throw 'App did not become ready. See .runtime/web-error.log; port 3000 may belong to another app.'
