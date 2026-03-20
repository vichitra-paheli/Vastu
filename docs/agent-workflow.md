# Vastu — Agent Development Workflow v3

> Version 3.0 · March 2026 · Updated after Phase 0 learnings
> Tool: Claude Code with subagents · Coordination: GitHub Issues/PRs · Monorepo: Turborepo

---

## Changes from v2

| v2 | v3 | Why |
|----|-----|-----|
| One branch per phase | One branch per feature, sub-branches per task | Scoped PRs, isolated failures, parallel features |
| QA runs once after all implementation | Per-feature QA + optional full-phase QA at end | Catches bugs at feature boundary, not phase boundary |
| No per-task code review | Dev → Code Reviewer loop per task | Early bug detection, smaller review surface |
| Lead merges everything | Lead merges sub-branch PRs. Human merges feature → main | Human reviews at the right level (feature, not task) |
| No documentation agent | Dedicated docs-engineer agent | Developer docs are a first-class deliverable |
| Agents leave artifacts around | Agents commit reusable work, delete transient files | Clean slate for next agent session |

---

## 1. Philosophy

**Humans review at feature boundaries, not task boundaries.** Feature → main PRs require human approval. Task → feature PRs are merged by the lead engineer agent. This keeps humans at a useful altitude.

**Every task gets a review loop.** Dev implements, code reviewer reviews — per task, not batched. Bugs caught at task level are 10x cheaper than bugs caught at phase level.

**Agents leave the campsite cleaner than they found it.** Every agent commits reusable output (code, tests, docs) and deletes transient artifacts (scratch files, debug logs, temporary notes). The next agent starts from a clean git state.

**Documentation is a deliverable, not an afterthought.** A docs-engineer agent maintains developer documentation alongside implementation. When a feature ships, its docs ship too.

---

## 2. Branching model

```
main                                    ← always green, human-merged only
├── feature/VASTU-0-001-auth-login      ← one branch per feature (user story)
│   ├── task/VASTU-0-001a-login-form    ← sub-branch per task
│   ├── task/VASTU-0-001b-keycloak      ← sub-branch per task
│   └── task/VASTU-0-001c-tests         ← sub-branch per task
├── feature/VASTU-0-002-registration    ← parallel feature branch
│   └── ...
└── feature/VASTU-0-003-shell-layout    ← depends on 001 + 002 → branches from main after they merge
```

### Rules

**Feature branches** (`feature/VASTU-{phase}-{id}-{slug}`):
- Branch from `main`
- One per user story from the requirements doc
- PR to `main` requires human review and approval
- Must pass full CI before merge
- Squash-merge to main for clean history

**Task sub-branches** (`task/VASTU-{phase}-{id}{letter}-{slug}`):
- Branch from their parent feature branch
- One per task from the implementation plan
- PR to the feature branch — lead engineer can merge without human review
- Must pass CI (lint + typecheck + tests)

**Dependent features** wait for their dependency to merge to `main` before branching:
```
1. feature/VASTU-0-001-auth-login merges to main     ✓
2. feature/VASTU-0-003-shell-layout branches FROM main (now has auth)
```

This means independent features can run in parallel, while dependent features are naturally sequenced by the main branch state.

---

## 3. Per-task workflow (the inner loop)

Every task follows this cycle. One Claude Code session per step.

```
┌─ DEV ENGINEER ──────────────────────┐
│ 1. Branch: task/VASTU-0-001a-...    │
│ 2. Implement code + unit tests      │
│ 3. Commit reusable work             │
│ 4. Delete any scratch/temp files    │
│ 5. Push + create PR to feature      │
└─────────────┬───────────────────────┘
              │
              ▼
┌─ CODE REVIEWER (fresh session) ─────┐
│ 6. Review the task PR               │
│ 7. Post findings as PR comments     │
│    🔴 must-fix → back to step 1     │
│    🟡 tech debt → file issue        │
│    🟢 clean → approve               │
└─────────────┬───────────────────────┘
              │ (approved)
              ▼
┌─ LEAD ENGINEER ─────────────────────┐
│ 8. Merge task PR into feature       │
│    (no human review needed)         │
└─────────────────────────────────────┘
```

If code reviewer finds 🔴 issues, dev engineer gets a fresh session, reads the review comments, fixes, and pushes to the same task branch. Reviewer reviews again. Max 3 cycles.

---

## 4. Per-feature workflow (the outer loop)

After all tasks for a feature are merged into the feature branch:

```
┌─ QA ENGINEER (fresh session) ───────┐
│ 1. Checkout feature branch          │
│ 2. Read user story + acceptance     │
│ 3. Write E2E tests for the feature  │
│ 4. Run full test suite              │
│ 5. File bug issues if failures      │
│    Bugs → dev fixes on feature      │
│    branch (task sub-branch cycle)   │
│ 6. All green → approve              │
└─────────────┬───────────────────────┘
              │
              ▼
┌─ DOCS ENGINEER (fresh session) ─────┐
│ 7. Write/update docs for feature    │
│ 8. Commit to feature branch         │
└─────────────┬───────────────────────┘
              │
              ▼
┌─ HUMAN REVIEW ──────────────────────┐
│ 9. Review feature PR (code + docs)  │
│ 10. Approve → squash-merge to main  │
└─────────────────────────────────────┘
```

---

## 5. Full phase flow

```
YOU + CLAUDE write requirements.md
        │
        ▼
ARCHITECT → plan.md
        │
        ▼
LEAD ENGINEER → GitHub issues + todo.md (with dependency graph)
        │
        ▼
FOR EACH FEATURE (parallel where no deps):
  │
  ├─ FOR EACH TASK in feature:
  │     Dev Engineer → implement on task sub-branch
  │     Code Reviewer → review task PR
  │     Lead Engineer → merge task PR into feature
  │
  ├─ QA Engineer → E2E tests on feature branch
  ├─ Docs Engineer → documentation on feature branch
  ├─ Human → review + merge feature PR to main
  │
  └─ Dependent features now branch from updated main
        │
        ▼
(Optional) QA ENGINEER → full phase regression on main
        │
        ▼
LEAD ENGINEER → completion.md
        │
        ▼
YOU + CLAUDE review completion, write next phase requirements
```

---

## 6. Agent roles (8 agents)

### 6.1 Architect (Opus, read-only)
Unchanged from v2. Reads requirements + codebase, produces plan.md.

### 6.2 Lead Engineer (Opus)
Updated responsibilities:
- Decomposes plan into features (user stories) and tasks (subtasks within each feature)
- Creates GitHub issues with dependency labels
- Creates todo.md with feature → task hierarchy and dependency graph
- **Merges task sub-branch PRs into feature branches** (reviews PR title, CI status, and basic sanity — not a full code review)
- Compiles completion.md at end of phase

### 6.3 Design Engineer (Sonnet)
Unchanged. UI implementation, design system compliance, accessibility.

### 6.4 Dev Engineer (Sonnet)
Updated workflow:
- Creates task sub-branch from feature branch
- Implements on sub-branch
- **Commits all reusable work** (code, tests, configs)
- **Deletes all transient artifacts** (scratch files, debug logs, temp notes, any `__tmp_*` or `*.bak` files)
- Pushes and creates PR to feature branch
- If code reviewer finds 🔴 issues: reads PR comments, fixes in fresh session, pushes to same branch

### 6.5 QA Engineer (Sonnet, fresh context)
Updated scope:
- **Per-feature QA** (not per-phase): writes E2E tests scoped to the user story being tested
- Checks out the feature branch, not main
- Files bugs as issues linked to the feature
- **Phase-level regression** is a separate optional run triggered manually on main after all features merge

### 6.6 Code Reviewer (Opus, fresh context, read-only)
Updated scope:
- **Per-task PR review** (not per-phase): reviews the diff in the task sub-branch PR
- Posts findings as PR comments (not a separate file)
- Approves or requests changes on the PR
- Smaller review surface = faster, more focused reviews

### 6.7 DevOps Engineer (Sonnet)
Unchanged. CI/CD, Docker, infrastructure.

### 6.8 Docs Engineer (NEW — Sonnet)
New agent. Maintains developer documentation in `/docs/` using **Fumadocs** (Next.js-native, MDX-based).

---

## 7. Docs Engineer — full definition

### Purpose
Maintain developer-facing documentation that serves both humans browsing the docs site and agents reading markdown files from disk. The audience is developers who clone Vastu to build their own applications.

### Documentation tool: Fumadocs
- Next.js native (same stack as Vastu)
- MDX-based (markdown with components)
- File-based routing in `/docs/content/`
- Built-in search, table of contents, code highlighting
- Output is both a deployable docs site and plain readable markdown on disk

### Documentation structure
```
docs/
├── content/
│   ├── getting-started/
│   │   ├── installation.mdx
│   │   ├── project-structure.mdx
│   │   ├── docker-setup.mdx
│   │   └── first-page.mdx
│   ├── architecture/
│   │   ├── overview.mdx
│   │   ├── auth.mdx
│   │   ├── permissions.mdx
│   │   ├── database.mdx
│   │   └── design-system.mdx
│   ├── guides/
│   │   ├── creating-pages.mdx
│   │   ├── builder-mode.mdx
│   │   ├── view-engine.mdx
│   │   ├── adding-mcp-tools.mdx
│   │   └── custom-components.mdx
│   ├── components/
│   │   ├── vastu-table.mdx
│   │   ├── vastu-context-menu.mdx
│   │   ├── vastu-chart.mdx
│   │   ├── truncated-text.mdx
│   │   └── empty-state.mdx
│   ├── api-reference/
│   │   ├── prisma-schema.mdx
│   │   ├── mcp-tools.mdx
│   │   ├── hooks-api.mdx
│   │   └── casl-permissions.mdx
│   └── decisions/
│       ├── ADR-001-auth.mdx
│       └── ADR-002-sso-storage.mdx
├── fumadocs.config.ts
└── package.json
```

### When the docs agent runs
- After each feature's implementation is complete (before human review of the feature PR)
- The agent reads the new code, existing docs, and writes/updates documentation for the feature
- Docs are committed to the feature branch so the PR includes code + tests + docs

### What the docs agent produces per feature
- **New pages** for new concepts, components, or APIs introduced by the feature
- **Updated pages** when existing documented behavior changes
- **Code examples** that are real, runnable, and reference actual file paths in the codebase
- **API reference updates** when Prisma schema, MCP tools, or hooks change

---

## 8. Clean slate rule

Every agent must leave a clean working state for the next agent.

### What "clean" means
```bash
# After an agent session, the repo should pass:
git status           # no untracked files (except in .gitignore)
git diff             # no uncommitted changes
pnpm lint            # no lint errors
pnpm typecheck       # no type errors
```

### Agent checklist (before ending session)

**Commit:**
- Source code files (`.ts`, `.tsx`, `.css`, `.mdx`)
- Test files (`.test.ts`, `.spec.ts`)
- Configuration files (`.json`, `.yml`, `.toml`)
- Documentation files (`.md`, `.mdx`)
- Migration files (Prisma)

**Delete:**
- Scratch/temp files (`*.tmp`, `*.bak`, `__tmp_*`, `scratch.*`)
- Debug logs (any files created for debugging)
- Exploratory code not part of the deliverable
- Downloaded files used during investigation
- Any file created by the agent that isn't committed

**Verify:**
- `git status` shows clean working tree
- `pnpm lint` passes
- `pnpm typecheck` passes
- `pnpm test` passes for affected package

### Implementation
Add to every agent's prompt:
```
Before ending your session:
1. Stage and commit all reusable work (code, tests, docs, configs)
2. Delete any temporary or scratch files you created
3. Run: git status (must be clean), pnpm lint, pnpm typecheck
4. If anything fails, fix it before ending
```

---

## 9. Updated pipeline commands

### Start a phase
```bash
# Architect designs
claude -p "Use architect on phases/phase-1/"

# Lead engineer creates issues and todo
claude -p "Use lead-engineer to decompose phases/phase-1/"
```

### Work on a feature (e.g., VASTU-1-003)
```bash
# Create feature branch
git checkout main && git pull
git checkout -b feature/VASTU-1-003-dockview-shell

# Task A: implement
claude -p "Use dev-engineer for task VASTU-1-003a from phases/phase-1/todo.md. Branch: task/VASTU-1-003a-panel-host"

# Task A: review (fresh session)
claude -p "Use code-reviewer to review PR for task/VASTU-1-003a-panel-host"

# Lead merges task PR (or you merge it if simple)
gh pr merge <PR-number> --squash

# Task B: implement (branches from feature, which now has task A)
claude -p "Use dev-engineer for task VASTU-1-003b from phases/phase-1/todo.md. Branch: task/VASTU-1-003b-tab-bar"

# ... repeat for each task ...

# QA on the complete feature
claude -p "Use qa-engineer to verify feature VASTU-1-003 on branch feature/VASTU-1-003-dockview-shell"

# Docs for the feature
claude -p "Use docs-engineer to document feature VASTU-1-003 on branch feature/VASTU-1-003-dockview-shell"

# Create PR to main → human reviews → merge
gh pr create --base main --title "feat(workspace): add Dockview shell [VASTU-1-003]"
```

### End of phase
```bash
# Optional: full regression QA on main
claude -p "Use qa-engineer to run full phase-1 regression on main"

# Completion doc
claude -p "Use lead-engineer to compile completion for phases/phase-1/"
```

---

## 10. Best practices (updated)

### New in v3

**Keep task PRs small.** The dev → reviewer loop works because the diff is small (one task, <500 lines). If a task PR is huge, the reviewer will miss things. Break it down further.

**Merge task PRs promptly.** Don't let task PRs pile up on the feature branch. Merge each as it's approved so subsequent tasks branch from the latest feature state.

**Feature branches are short-lived.** A feature branch should live for days, not weeks. If a feature is taking too long, it's too big — split it into smaller features in the next planning session.

**Docs ship with features.** Don't accumulate a "write docs for everything" task at the end. Each feature PR includes its documentation. If the feature PR doesn't have docs, it's not complete.

**Run QA on the feature branch, not main.** QA validates the feature in isolation. Phase-level regression on main is a safety net, not the primary quality gate.

**Clean your room.** After every agent session: commit what matters, delete what doesn't, verify the repo is clean. The next agent shouldn't have to wonder "did the last agent leave this file here on purpose?"

### Carried from v2

- Invest in the requirement doc — 30min of writing prevents hours of rework
- Fresh sessions for every role switch
- Let linters enforce style, not CLAUDE.md
- Evolve CLAUDE.md from agent mistakes
- Don't let agents self-orchestrate — the pipeline decides, agents execute
- Don't gold-plate — acceptance criteria are the scope

---

## Appendix: Decision log (v3 updates)

| Decision | Rationale |
|----------|-----------|
| Feature branch per feature (not per phase) | Scoped PRs, isolated failures, parallel work, meaningful human review unit |
| Task sub-branches with agent-merged PRs | Fast iteration without human bottleneck on every task |
| Per-task dev→reviewer loop | Catches bugs at smallest possible scope — cheaper to fix |
| Per-feature QA (not per-phase) | QA validates the feature boundary, not an amorphous phase blob |
| Dependent features wait on main | Ensures dependencies are truly complete and merged before downstream work begins |
| Docs engineer as dedicated agent | Documentation quality requires fresh context and dedicated attention |
| Fumadocs for documentation | Same stack (Next.js/MDX), file-based (agent-readable), deployable (human-browsable) |
| Clean slate rule | Eliminates inter-agent confusion from leftover files, failed experiments, or debug artifacts |
| Phase-level QA is manual/optional | Safety net, not primary gate — per-feature QA is the real quality check |
