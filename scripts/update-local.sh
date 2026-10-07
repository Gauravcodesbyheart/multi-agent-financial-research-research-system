#!/usr/bin/env bash
#
# Update (or clone) FinResearch AI on this machine and check the setup.
#
#   ./scripts/update-local.sh              update the code, install deps, run the doctor
#   ./scripts/update-local.sh --migrate    ...and apply database migrations afterwards
#   ./scripts/update-local.sh --help
#
set -euo pipefail

REPO_URL="https://github.com/Gauravcodesbyheart/multi-agent-financial-research-research-system.git"
BRANCH="arena/a267d0d5-multi-agent-financial-research"
RUN_MIGRATIONS=0

for arg in "$@"; do
  case "$arg" in
    --migrate) RUN_MIGRATIONS=1 ;;
    -h|--help)
      sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '   \033[32mOK\033[0m   %s\n' "$*"; }
warn() { printf '   \033[33mWARN\033[0m %s\n' "$*"; }
die()  { printf '   \033[31mFAIL\033[0m %s\n' "$*" >&2; exit 1; }

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
say "1. Checking prerequisites"
command -v node >/dev/null 2>&1 || die "Node.js is not installed. Install Node 20.9+ from https://nodejs.org"
command -v git  >/dev/null 2>&1 || die "Git is not installed. Install it from https://git-scm.com"

node_version="$(node -p 'process.versions.node')"
if ! node -p 'const [a,b]=process.versions.node.split(".").map(Number); a>20||(a===20&&b>=9)' | grep -q true; then
  die "Node $node_version is too old — Next.js 16 needs Node 20.9 or newer."
fi
ok "Node $node_version, git $(git --version | awk '{print $3}')"

# ── 2. Get into the project ───────────────────────────────────────────────────
say "2. Locating the project"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ROOT="$(git rev-parse --show-toplevel)"
  cd "$ROOT"
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "$REPO_URL"
    warn "No 'origin' remote found — added $REPO_URL"
  fi
  ok "Updating the existing checkout in $ROOT"

  if [ -n "$(git status --porcelain)" ]; then
    die "You have uncommitted changes. Save or stash them first:
        git stash push -m \"my local work\"
      then run this script again (restore later with: git stash pop)."
  fi

  git fetch --prune origin
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git checkout "$BRANCH"
  else
    git checkout -b "$BRANCH" --track "origin/$BRANCH"
  fi
  git pull --ff-only origin "$BRANCH"
else
  DIR="multi-agent-financial-research-research-system"
  [ -e "$DIR" ] && die "$DIR already exists but is not a git repository. Move it aside and re-run."
  git clone --branch "$BRANCH" "$REPO_URL" "$DIR"
  cd "$DIR"
  ok "Cloned into $(pwd)"
fi
ok "On branch $(git rev-parse --abbrev-ref HEAD) at $(git log --oneline -1)"

# ── 3. Dependencies ───────────────────────────────────────────────────────────
say "3. Installing dependencies"
npm install --no-audit --no-fund
ok "Dependencies installed"

# ── 4. Environment file ───────────────────────────────────────────────────────
say "4. Checking .env"
if [ ! -f .env ]; then
  cp .env.example .env
  warn "Created .env from .env.example — you must now fill in your real values:"
  printf '        DATABASE_URL   Neon *pooled* host, ends with ?sslmode=require\n'
  printf '        DIRECT_URL     Neon *direct* host (migrations only)\n'
  printf '        NEXTAUTH_SECRET  openssl rand -base64 32\n'
  printf '        GROQ_API_KEY   https://console.groq.com/keys\n'
  NEEDS_EDIT=1
else
  ok ".env exists"
  NEEDS_EDIT=0
  grep -q 'ep-xxx'              .env && { warn "DATABASE_URL still contains the example placeholder (ep-xxx)."; NEEDS_EDIT=1; }
  grep -q 'user:password'       .env && { warn "Database URL still contains the example placeholder (user:password)."; NEEDS_EDIT=1; }
  grep -q 'replace-with-a-long-random-secret' .env && { warn "NEXTAUTH_SECRET is still the example value."; NEEDS_EDIT=1; }
  if ! grep -qE '^GROQ_API_KEY=.+' .env; then
    warn "GROQ_API_KEY is empty — the app will run, but Research answers stay as raw passages."
  fi
fi

# ── 5. Database ───────────────────────────────────────────────────────────────
say "5. Database"
if [ "$RUN_MIGRATIONS" = "1" ]; then
  echo "   Applying migrations with drizzle-kit (uses DIRECT_URL when set)..."
  npx drizzle-kit migrate
  ok "Migrations applied"
elif [ "$NEEDS_EDIT" = "1" ]; then
  warn "Skipped: finish editing .env first."
else
  echo "   Not applying migrations automatically (they only run once per database anyway)."
  echo "     New empty database?   npx drizzle-kit migrate"
  echo "     Created with push?    npx drizzle-kit push"
  echo "   Or re-run this script with --migrate."
fi

# ── 6. Verify ─────────────────────────────────────────────────────────────────
say "6. Running the setup doctor"
if npm run doctor; then
  ok "Setup verified"
else
  warn "The doctor reported problems — fix the items it listed above, then re-run: npm run doctor"
fi

# ── 7. Next steps ─────────────────────────────────────────────────────────────
say "Done"
if [ "$NEEDS_EDIT" = "1" ]; then
  echo "   Next: edit .env with your real Neon and Groq values, then run:"
  echo "     npm run doctor && npm run dev"
else
  echo "   Next: npm run dev"
  echo "   Then open http://localhost:3000 and click \"Load Demo Data\" on the dashboard."
fi
echo
