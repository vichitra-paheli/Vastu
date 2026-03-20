# Vastu — Agent Development Workflow

> Version 0.2 · March 2026 · Living document
> Tool: Claude Code with subagents · Coordination: GitHub Issues/PRs · Monorepo: Turborepo

---

## 1. Philosophy

**Humans steer at phase boundaries; agents own everything in between.** You write the requirement doc and review the completion doc. Between those two moments, agents design, decompose, implement, test, and verify autonomously.

**Phase-level planning, not feature-level micromanagement.** Each development phase gets a single requirement document with user stories. Agents decompose it into GitHub issues, implement, and verify without waiting for human approval at each step.

**Deterministic orchestration, creative execution.** The pipeline moving work from design → decompose → implement → test is rule-based. Agents doing the work within each step are creative and autonomous. Agents never decide what step comes next — the pipeline does.

**Fresh context for every review.** Writer and reviewer always use separate Claude Code sessions. This prevents confirmation bias.

**Outputs are disposable; requirements and prompts compound.** When agents produce bad code, fix the requirement doc or the prompt — not just the code.

---

## 2. The development loop

```
┌─────────────────────────────────────────────────┐
│            YOU + CLAUDE (Planning)                │
│  1. Write phase requirement doc (user stories)   │
│  2. Drop in /phases/phase-{N}/                   │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│         AGENT PIPELINE (Autonomous)              │
│  3. Architect → plan.md                          │
│  4. Lead Engineer → GitHub issues + todo.md      │
│  5. Dev/Design Engineers → code + unit tests     │
│  6. QA Engineer → E2E tests + bug reports        │
│  7. Code Reviewer → review findings              │
│  8. Fix loop (5-7) until green                   │
│  9. Lead Engineer → completion.md                │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│            YOU + CLAUDE (Review)                  │
│  10. Review completion doc vs requirements       │
│  11. Approve → merge → write next phase reqs     │
└─────────────────────────────────────────────────┘
```

Human touchpoints: only steps 1-2 and 10-11.

---

## 3. Phase requirement document format

### 3.1 Location

```
vastu/phases/
├── phase-0-foundation/
│   ├── requirements.md     ← you + Claude write this
│   └── completion.md       ← agents produce this
├── phase-1-enterprise-shell/
└── ...
```

### 3.2 Template

```markdown
# Phase N: [Name]
> Target: Weeks X–Y
> References: wireframes (groups X-Y), patterns library

## Phase goal
One paragraph: what's true when done that isn't true today.

## User stories

### US-001: [Title]
**As a** [role], **I want** [action], **so that** [outcome].
**Acceptance criteria:**
- [ ] AC-1: [Specific, testable]
- [ ] AC-2: [Another]
**Wireframe:** Group [X], Screen [N]
**Patterns:** [From patterns library]

## Technical constraints
## Out of scope
## Definition of done
```

### 3.3 Writing guidelines

- Be specific in acceptance criteria. "Table loads" is untestable. "Table loads 25 rows in <500ms with skeleton state" is testable.
- Reference wireframes explicitly: "See Group B, Screen 4 — table listing template."
- Reference patterns explicitly: "Follow filter pattern from Patterns Library §2."
- Scope ruthlessly. If it's not in user stories, it's not in the phase.
- Number everything. US-001, AC-1. Agents reference these in issues and completion doc.

### 3.4 Artifacts available to agents

| Artifact | Location |
|----------|----------|
| Design principles | /docs/design-principles.md |
| Style guide | /docs/style-guide.md |
| Patterns library | /docs/patterns-library.md |
| Mantine theme | /packages/workspace/theme/vastu.theme.ts |
| CSS tokens | /packages/workspace/theme/vastu.tokens.css |
| Wireframes | /docs/wireframes/ |
| Previous completion | /phases/phase-{N-1}/completion.md |
| CLAUDE.md hierarchy | Root + package-level |

---

## 4. CLAUDE.md hierarchy

```
vastu/
├── CLAUDE.md                    # Root: universal conventions (<15KB)
├── packages/
│   ├── shell/CLAUDE.md          # Shell: Next.js, auth, SSR
│   ├── workspace/CLAUDE.md      # Workspace: Dockview, Mantine
│   ├── shared/CLAUDE.md         # Shared: Prisma, types, utils
│   └── agent-runtime/CLAUDE.md  # Agent: LangGraph, AG-UI, MCP
└── .claude/agents/              # Subagent definitions
```

Root CLAUDE.md contains: project overview, architecture summary, build/test commands, commit conventions, testing requirements, key conventions (tokens, TruncatedText, loading states, MCP parity, TS strict), design doc references. Keep lean — let linters enforce code style.

Package CLAUDE.md files contain: local stack, local patterns, local test commands, common mistakes agents make in that package.

---

## 5. Agent roles and prompts

Seven subagents in `.claude/agents/`. Each runs in its own session with isolated context.

### 5.1 Architect

**Model:** Opus · **Tools:** Read, Grep, Glob, WebSearch (read-only)

Reads phase requirements + codebase. Produces `plan.md` covering per-story: components to create/modify (file paths), DB changes (Prisma), API/MCP surface, state management, component hierarchy, design system mapping (wireframes + patterns), edge cases, testing strategy, complexity estimates. Phase-level: cross-cutting concerns, dependency order, risks. Never writes code. Flags items needing human decision with ⚠️.

### 5.2 Lead Engineer

**Model:** Opus · **Tools:** Read, Write, Edit, Bash, Grep, Glob

Two jobs. First: read requirements + plan, create GitHub issues (`gh issue create` with title, body, labels, deps, milestone), write `todo.md` with ordered subtasks and parallel groups. Issues are small (<500 lines). Every implementation issue includes testing. Second (after pipeline completes): compile `completion.md` from issue statuses, test results, and review findings.

### 5.3 Design Engineer

**Model:** Sonnet · **Tools:** Read, Write, Edit, Bash, Grep, Glob

UI implementation specialist. Reads wireframes + style guide + patterns library before starting. Ensures: all colors via --v-* tokens, TruncatedText on truncatable text, loading choreography on async ops, right-click context menus on data surfaces, keyboard navigation, WCAG 2.2 AA (contrast, ARIA, focus management). Two font weights only (400/500). Tests in light and dark mode.

### 5.4 Dev Engineer

**Model:** Sonnet · **Tools:** Read, Write, Edit, Bash, Grep, Glob

Feature implementation: business logic, API routes, state management (Zustand + TanStack Query), MCP tools, unit tests. One issue per session. Reads spec + plan + issue before starting. Searches codebase for existing patterns first. Follows the plan — flags deviations on the issue rather than deviating silently. TypeScript strict. Runs lint + typecheck + tests before committing. Never installs new deps without flagging.

### 5.5 QA Engineer

**Model:** Sonnet · **Tools:** Read, Bash, Grep, Glob (no source editing)

Fresh context — did NOT write this code. Reads spec + plan + code skeptically. For each user story: verifies acceptance criteria, identifies edge cases (null, permissions, concurrency, network failures, special characters), writes Playwright E2E tests, runs full suite. Files bug issues (labeled `bug` + `phase-{N}`) for any failures. Also checks: pattern violations (hardcoded color, missing truncation, no loading state), MCP tool parity.

### 5.6 Code Reviewer

**Model:** Opus · **Tools:** Read, Grep, Glob (read-only)

Fresh context. Reviews all changed files for: correctness vs spec, design system compliance (tokens, truncation, loading, context menus, keyboard, a11y), code quality (TS strict, no dead code, function size, naming, duplication), security (no secrets, parameterized queries, auth checks, input validation), performance (virtualization, N+1, re-renders, bundle size), MCP parity. Categorizes: 🔴 must-fix (blocks completion), 🟡 should-fix (tech debt for next phase), 🟢 suggestion.

### 5.7 DevOps Engineer

**Model:** Sonnet · **Tools:** Read, Write, Edit, Bash, Grep, Glob

CI/CD pipeline (GitHub Actions), Docker (multi-stage builds), service containers (Keycloak, Postgres, Redis, MinIO), monitoring (OTel, Prometheus, Jaeger). CI order: lint → typecheck → tests → build → E2E (fail fast). Secrets via env vars only. All infra config version-controlled.

---

## 6. Autonomous agent pipeline

### 6.1 Stages

```
STAGE 1: DESIGN        Architect → plan.md
STAGE 2: DECOMPOSE     Lead Engineer → GitHub issues + todo.md
STAGE 3: IMPLEMENT     Dev + Design Engineers → code + tests
                       (per issue, parallel where no deps)
STAGE 4: VERIFY        QA Engineer (fresh) → E2E tests + bug issues
STAGE 5: REVIEW        Code Reviewer (fresh) → findings
  ↳ If 🔴 bugs exist → back to STAGE 3 (max 3 loops)
STAGE 6: COMPLETION    Lead Engineer → completion.md
```

### 6.2 Stage 3 details (Implement)

Issues run in dependency order from todo.md. Issues with no dependency relationship run in parallel via separate Claude Code sessions on separate git worktrees.

Each agent session:
1. Read spec + plan + issue
2. Implement
3. Run lint + typecheck + tests
4. If tests fail → fix (up to 3 retries)
5. If still failing → file blocking bug issue
6. Commit with conventional message + issue reference
7. Close issue if all acceptance criteria met

### 6.3 Stage 4 details (Verify)

QA runs in a completely fresh session. Reads spec and code independently — no implementation context. Writes Playwright E2E tests per user story. Files bug issues for failures.

### 6.4 Stage 5 details (Review)

Code Reviewer in fresh Opus session. Reviews ALL changed files in the phase. 🔴 items trigger a fix loop. 🟡 items filed as issues for next phase.

### 6.5 Bug fix loop

When QA or Reviewer files 🔴 bugs:
1. Pipeline returns to Stage 3 for those specific issues only
2. Dev agent fixes in fresh session
3. QA re-verifies the fix
4. Reviewer re-reviews
5. Max 3 loops. Unresolved items noted in completion doc as "requires human attention."

### 6.6 Parallel execution

```bash
# Parallel group from todo.md (no deps between these)
# Separate worktrees, simultaneous sessions
git worktree add ../vastu-wt-001 feature/phase-0
git worktree add ../vastu-wt-003 feature/phase-0

claude -p "Use dev-engineer for VASTU-0-001"   # session 1
claude -p "Use dev-engineer for VASTU-0-003"   # session 2 (parallel)
```

After a parallel group completes, merge worktrees back, start next group.

---

## 7. Phase completion document format

Produced by Lead Engineer after all stages.

```markdown
# Phase N: [Name] — Completion Report
> Completed: [date] · Duration: [actual vs estimated]

## User story status
| Story | Status | Issues | Tests | Notes |
|-------|--------|--------|-------|-------|
| US-001 | ✅ Complete | 001, 002 | 12 unit, 3 E2E | — |
| US-002 | ⚠️ Partial | 003-005 | 8 unit, 2 E2E | [reason] |

## Acceptance criteria verification
Per story: checkboxes with test file references.

## Design system compliance
Tokens ✅ · TruncatedText ✅ · Loading states ✅ ·
Context menus ✅ · Keyboard nav ✅ · MCP parity ✅

## Review findings
Resolved 🔴 · Deferred 🟡 (filed for next phase) · Suggestions 🟢

## Known issues (requires human attention)
## Test coverage (unit count, E2E count, % coverage)
## Files changed summary
## Recommendations for next phase
```

### What you review

1. Story status — any ⚠️ Partial?
2. Acceptance criteria — all checked? Test references real?
3. Design compliance — any ❌?
4. Review findings — deferred 🟡 acceptable as debt?
5. Known issues — anything blocking next phase?
6. Recommendations — input for next requirement doc.

Then: approve → merge to main → write next phase requirements.

---

## 8. Quality gates

| Transition | Check |
|-----------|-------|
| Design → Decompose | plan.md exists, all stories covered |
| Decompose → Implement | todo.md + issues exist |
| Per-issue complete | lint + typecheck + tests pass |
| Implement → Verify | All issues closed |
| Verify → Review | E2E tests for all stories |
| Review → Completion | No open 🔴 items |

CI pipeline (every commit, fail fast): lint (30s) → typecheck (45s) → unit tests (2min) → build (3min) → E2E (5min) → coverage (30s).

Pre-commit hook: `pnpm lint-staged` on staged files.

---

## 9. Git and branching

```
main                         ← always green
├── feature/phase-0          ← one branch per phase
├── feature/phase-1          ← squash-merge when complete
└── fix/hotfix-{id}          ← critical bugs only
```

One PR per phase. Squash-merge for clean history. Conventional Commits with issue references: `feat(workspace): add view toolbar [VASTU-0-001]`.

---

## 10. Hooks and automation

### Orchestration options (start simple)

**Option A: Manual** (recommended to start)
Run each agent command sequentially after the previous completes.

**Option B: Script**
Shell script reads todo.md, runs agents in dependency order, loops on bugs.

**Option C: GitHub Actions**
Push requirements.md → pipeline runs → completion.md appears. Fully automated.

Start with A. Graduate to B when proven. Consider C when confidence is high.

### Hooks
- **PreCommit:** `pnpm lint-staged`
- **SubagentStop:** Check stage status, lint modified files, print next command.

---

## 11. Best practices and anti-patterns

### Do
- Invest 30min in the requirement doc — prevents hours of rework
- Fresh sessions for every role switch (`/clear` between agents)
- Let linters enforce style — not CLAUDE.md
- Read the completion doc carefully — cross-reference acceptance criteria
- Evolve CLAUDE.md from agent mistakes — every rule traces to a real error
- Compact past 50% context — `/clear` and restart

### Don't
- Don't intervene mid-pipeline — let it finish, fix in next loop
- Don't skip QA — fresh context catches what writers miss
- Don't let agents self-orchestrate — pipeline decides, agents execute
- Don't use `any` to unblock TypeScript — flag it
- Don't gold-plate — acceptance criteria are the scope, nothing more
- Don't add deps without flagging — every package is permanent debt

---

## 12. Getting started

```bash
# 1. You + Claude write requirements.md (in this conversation)
# 2. Save to phases/phase-0-foundation/requirements.md
# 3. Create phase branch
git checkout -b feature/phase-0

# 4. Run pipeline (Option A)
claude -p "Use architect on phases/phase-0-foundation/"
claude -p "Use lead-engineer on phases/phase-0-foundation/"
# Per issue from todo.md:
claude -p "Use dev-engineer for VASTU-0-001"
claude -p "Use design-engineer for VASTU-0-002"
# After all issues:
claude -p "Use qa-engineer on phases/phase-0-foundation/"
claude -p "Use code-reviewer on phases/phase-0-foundation/"
claude -p "Use lead-engineer to compile completion for phase-0"

# 5. Review completion.md with Claude
# 6. Approve → merge → write phase 1 requirements
```

| I want to... | Command |
|---------------|---------|
| Start a phase | Drop requirements.md in /phases/phase-{N}/ |
| Design | `claude -p "Use architect on phases/phase-{N}/"` |
| Decompose | `claude -p "Use lead-engineer on phases/phase-{N}/"` |
| Implement | `claude -p "Use dev-engineer for VASTU-{N}-{ID}"` |
| Implement UI | `claude -p "Use design-engineer for VASTU-{N}-{ID}"` |
| QA | `claude -p "Use qa-engineer on phases/phase-{N}/"` |
| Review | `claude -p "Use code-reviewer on phases/phase-{N}/"` |
| Complete | `claude -p "Use lead-engineer to compile completion for phase-{N}"` |
| Fix infra | `claude -p "Use devops-engineer to fix [issue]"` |

---

## Appendix: Decision log

| Decision | Rationale |
|----------|-----------|
| Phase-boundary human involvement | Max agent autonomy; human judgment at "what" and "was it right" |
| One PR per phase | Reduces overhead; completion doc is structured review |
| Deterministic pipeline | Agents skip steps when self-orchestrating |
| Fresh context for QA + review | Writer bias prevents catching own issues |
| Opus for architect + reviewer | High-stakes decisions need max reasoning |
| Sonnet for implementers | Speed + bounded tasks |
| Bug fix loop max 3 | Prevents infinite loops; escalates to human |
| Squash-merge per phase | Clean history; one revert point per phase |
| Phase dirs over feature dirs | Matches human review cadence |
