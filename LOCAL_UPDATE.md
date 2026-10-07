# Getting the fixes onto your computer

This branch (`arena/a267d0d5-multi-agent-financial-research`) contains four commits of
fixes on top of the code you already have:

| Commit | What it fixes |
| --- | --- |
| `634108e` | Agents silently failing to see documents; silent degradation when the AI key was missing; non-ASCII text loss |
| `d94ed53` | Switched the AI provider from Gemini to **Groq** and the database guidance to **Neon** |
| `551b428` | Malformed input returning 500 instead of 400; deletes reporting success when nothing was deleted; demo seeding doing nothing when an account already existed |
| `074cfad` | Guaranteed JSON-mode prompts satisfy Groq's documented requirement |

Your database schema is **unchanged** — the migration files in `drizzle/` are the same
ones you already have, so there is nothing new to migrate on an existing database.

---

## 1. What you need installed

* **Node.js 20.9 or newer** (`node -v`)
* **Git**
* A **Neon** Postgres project — <https://console.neon.tech>
* A **Groq** API key — <https://console.groq.com/keys>

You do **not** need PostgreSQL installed locally; the app talks to Neon.

---

## 2. Update the copy you already have

Open a terminal in your project folder and run:

```bash
# Save any work you have in progress first (skip if the folder is clean)
git status

# Download the new commits
git fetch origin

# Switch to the fixed branch (skip this line if you are already on it)
git checkout arena/a267d0d5-multi-agent-financial-research

# Apply the latest fixes
git pull --ff-only origin arena/a267d0d5-multi-agent-financial-research
```

If `git checkout` refuses because you have local edits you do not want to lose:

```bash
git stash push -m "my local work"
# ...then run the checkout and pull above, and later:
# git stash pop
```

### Starting from scratch instead?

```bash
git clone --branch arena/a267d0d5-multi-agent-financial-research \
  https://github.com/Gauravcodesbyheart/multi-agent-financial-research-research-system.git
cd multi-agent-financial-research-research-system
```

---

## 3. Install dependencies

The fixes removed the Gemini SDK and added npm scripts, so reinstall:

```bash
npm install
```

(`npm ci` also works and installs the exact locked versions.)

---

## 4. Create your `.env`

```bash
cp .env.example .env
```

Open `.env` and fill in **your own** values:

```env
# Neon → Project → Connect → "Pooled connection" (host contains -pooler)
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require"

# Neon → Connect → "Direct connection" (no -pooler). Used only by migrations.
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require"

# Generate one with: openssl rand -base64 32
NEXTAUTH_SECRET=replace-with-a-long-random-secret
NEXTAUTH_URL=http://localhost:3000

# From https://console.groq.com/keys — required for AI-written answers
GROQ_API_KEY=gsk_your_real_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

Two rules that matter on Neon:

* `DATABASE_URL` must be the **pooled** host (`-pooler`) and keep `?sslmode=require`.
* `DIRECT_URL` must be the **direct** host — migrations run through PgBouncer would
  otherwise fail. `drizzle.config.ts` prefers `DIRECT_URL` automatically.

Leave `EMBEDDING_*` empty unless you want semantic search: Groq has no embeddings API,
so keyword retrieval is used and everything else works normally.

---

## 5. Prepare the database

For a **brand-new Neon database**, apply the checked-in migrations:

```bash
npx drizzle-kit migrate
```

If your current database was created earlier with `drizzle-kit push`, keep using that
instead (it applies just the differences, and this branch added no schema changes):

```bash
npx drizzle-kit push
```

---

## 6. Check everything is wired up

```bash
npm run doctor
```

It checks `DATABASE_URL`, `NEXTAUTH_SECRET`, `GROQ_API_KEY`, the live Neon connection,
the tables, and whether any documents exist. You are looking for:

```text
All checks passed. Agents are fully operational.
```

---

## 7. Run it

```bash
npm run dev
```

Open <http://localhost:3000>, register an account, and click **Load Demo Data** on the
dashboard. You should now get a real confirmation such as
`Seeded 4 companies, 4 documents, 4 metric sets, 10 risk flags` — and clicking it a
second time honestly says the demo data is already present.

---

## 8. Verify the fixes yourself (optional)

```bash
npx tsc --noEmit     # types
npm run lint         # lint
npm test             # 40 unit tests, including regression tests for the bugs above
```

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Missing DATABASE_URL` / app refuses to start | `.env` missing or not loaded | Create `.env` in the project root; the server now fails loudly instead of silently using `localhost` |
| `remaining connection slots are reserved` | Using Neon's direct host, or a pool that is too large | Put the `-pooler` host in `DATABASE_URL` and keep `DATABASE_POOL_MAX` at 1–2 |
| Migrations hang or fail on Neon | DDL sent through PgBouncer | Set `DIRECT_URL` to the non-pooled host |
| Research answers come back as raw passages, not written analysis | `GROQ_API_KEY` missing or invalid | Add a valid key; the UI states this explicitly now |
| Uploads work but "Find Similar" is disabled | No embeddings provider configured | Expected: Groq has no embeddings API. Set `EMBEDDING_*` to any OpenAI-compatible provider to enable it |
| Login rejects a correct password | `NEXTAUTH_SECRET` changed after accounts were created | Keep the secret stable, or re-register |

---

## Opening a pull request

If you want these fixes on `main` rather than just the branch:

```bash
git push origin arena/a267d0d5-multi-agent-financial-research
```

then open <https://github.com/Gauravcodesbyheart/multi-agent-financial-research-research-system/pull/new/arena/a267d0d5-multi-agent-financial-research>.
