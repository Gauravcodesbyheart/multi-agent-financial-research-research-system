<#
.SYNOPSIS
  Update (or clone) FinResearch AI on this machine and check the setup.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\update-local.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\update-local.ps1 -Migrate

.NOTES
  Without -Migrate the script updates the code, installs dependencies, prepares
  .env and runs the setup doctor. Migrations are opt-in because the right command
  depends on how your database was created (migrate vs push).
#>
param(
  [switch]$Migrate
)

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/Gauravcodesbyheart/multi-agent-financial-research-research-system.git"
$Branch  = "arena/a267d0d5-multi-agent-financial-research"

function Say  ($m) { Write-Host "`n$m" -ForegroundColor White }
function Ok   ($m) { Write-Host "   OK   $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "   WARN $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "   FAIL $m" -ForegroundColor Red; exit 1 }

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
Say "1. Checking prerequisites"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Die "Node.js is not installed. Install Node 20.9+ from https://nodejs.org" }
if (-not (Get-Command git  -ErrorAction SilentlyContinue)) { Die "Git is not installed. Install it from https://git-scm.com" }

$nodeVersion = (node -p "process.versions.node")
$nodeParts   = $nodeVersion.Split(".")
$nodeOk      = ([int]$nodeParts[0] -gt 20) -or ([int]$nodeParts[0] -eq 20 -and [int]$nodeParts[1] -ge 9)
if (-not $nodeOk) { Die "Node $nodeVersion is too old - Next.js 16 needs Node 20.9 or newer." }
Ok "Node $nodeVersion"

# ── 2. Get into the project ───────────────────────────────────────────────────
Say "2. Locating the project"
git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -eq 0) {
  $root = (git rev-parse --show-toplevel)
  Set-Location $root
  git remote get-url origin *> $null
  if ($LASTEXITCODE -ne 0) { git remote add origin $RepoUrl; Warn "No 'origin' remote found - added $RepoUrl" }
  Ok "Updating the existing checkout in $root"

  if ((git status --porcelain)) {
    Die "You have uncommitted changes. Save or stash them first:`n        git stash push -m `"my local work`"`n      then run this script again (restore later with: git stash pop)."
  }

  git fetch --prune origin
  git show-ref --verify --quiet "refs/heads/$Branch"
  if ($LASTEXITCODE -eq 0) { git checkout $Branch } else { git checkout -b $Branch --track "origin/$Branch" }
  git pull --ff-only origin $Branch
} else {
  $dir = "multi-agent-financial-research-research-system"
  if (Test-Path $dir) { Die "$dir already exists but is not a git repository. Move it aside and re-run." }
  git clone --branch $Branch $RepoUrl $dir
  Set-Location $dir
  Ok "Cloned into $(Get-Location)"
}
Ok "On branch $(git rev-parse --abbrev-ref HEAD) at $(git log --oneline -1)"

# ── 3. Dependencies ───────────────────────────────────────────────────────────
Say "3. Installing dependencies"
npm install --no-audit --no-fund
Ok "Dependencies installed"

# ── 4. Environment file ───────────────────────────────────────────────────────
Say "4. Checking .env"
$needsEdit = $false
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Warn "Created .env from .env.example - you must now fill in your real values:"
  Write-Host "        DATABASE_URL     Neon *pooled* host, ends with ?sslmode=require"
  Write-Host "        DIRECT_URL       Neon *direct* host (migrations only)"
  Write-Host "        NEXTAUTH_SECRET  openssl rand -base64 32"
  Write-Host "        GROQ_API_KEY     https://console.groq.com/keys"
  $needsEdit = $true
} else {
  Ok ".env exists"
  $envText = Get-Content ".env" -Raw
  if ($envText -match "ep-xxx")                       { Warn "DATABASE_URL still contains the example placeholder (ep-xxx)."; $needsEdit = $true }
  if ($envText -match "user:password")                { Warn "Database URL still contains the example placeholder (user:password)."; $needsEdit = $true }
  if ($envText -match "replace-with-a-long-random-secret") { Warn "NEXTAUTH_SECRET is still the example value."; $needsEdit = $true }
  if ($envText -notmatch "(?m)^GROQ_API_KEY=.+")      { Warn "GROQ_API_KEY is empty - Research answers will stay as raw passages." }
}

# ── 5. Database ───────────────────────────────────────────────────────────────
Say "5. Database"
if ($Migrate) {
  Write-Host "   Applying migrations with drizzle-kit (uses DIRECT_URL when set)..."
  npx drizzle-kit migrate
  if ($LASTEXITCODE -eq 0) {
    Ok "Migrations applied"
  } else {
    # drizzle-kit exits non-zero but frequently prints nothing at all, which makes a
    # connection failure look like success. Say so explicitly.
    Warn "drizzle-kit could not apply the migrations (it often prints no reason)."
    Warn "Check DATABASE_URL / DIRECT_URL in .env, then run 'npm run doctor' for details."
  }
} elseif ($needsEdit) {
  Warn "Skipped: finish editing .env first."
} else {
  Write-Host "   Not applying migrations automatically (they only run once per database anyway)."
  Write-Host "     New empty database?   npx drizzle-kit migrate"
  Write-Host "     Created with push?    npx drizzle-kit push"
  Write-Host "   Or re-run this script with -Migrate."
}

# ── 6. Verify ─────────────────────────────────────────────────────────────────
Say "6. Running the setup doctor"
npm run doctor
if ($LASTEXITCODE -eq 0) { Ok "Setup verified" }
else { Warn "The doctor reported problems - fix the items it listed above, then re-run: npm run doctor" }

# ── 7. Next steps ─────────────────────────────────────────────────────────────
Say "Done"
if ($needsEdit) {
  Write-Host "   Next: edit .env with your real Neon and Groq values, then run:"
  Write-Host "     npm run doctor ; npm run dev"
} else {
  Write-Host "   Next: npm run dev"
  Write-Host "   Then open http://localhost:3000 and click `"Load Demo Data`" on the dashboard."
}
