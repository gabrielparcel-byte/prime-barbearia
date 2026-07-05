param(
  [string]$RepoPath = "C:\Users\Usuario\Downloads\prime",
  [string]$Branch = "master",
  [string]$Remote = "origin"
)

Start-Transcript -Path (Join-Path $RepoPath "scripts\auto-push.log") -Append | Out-Null

try {
  Set-Location -Path $RepoPath

  git rev-parse --is-inside-work-tree *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - não é um repositório git, abortando."
    exit 0
  }

  git add -A

  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - nada pra commitar."
    exit 0
  }

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  git commit -m "Auto-save: $timestamp" | Out-Null
  git push $Remote $Branch 2>&1 | Out-Null
  $pushStatus = if ($LASTEXITCODE -eq 0) { "ok" } else { "falhou (exit $LASTEXITCODE)" }
  Write-Host "$timestamp - commit criado e push $pushStatus"
} finally {
  Stop-Transcript | Out-Null
}
