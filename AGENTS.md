# Agent Development Rules

This repository is governed by the Space Intel governance files. Read them before planning or changing the project.

## Mandatory Context

Before planning or changing this project, agents and contributors must read:

1. `SPACE_INTEL_DEV_CONSTRAINTS.md`
2. `SPACE_INTEL_TASKS.md`
3. `SPACE_INTEL_ISSUES.md`

## Document Roles

- `SPACE_INTEL_DEV_CONSTRAINTS.md` records stable project constraints: architecture, security, compliance, source rules, data limits, repository boundaries, and verification requirements.
- `SPACE_INTEL_TASKS.md` records current work: active tasks, milestone status, blocked work, completed major tasks, and open decisions.
- `SPACE_INTEL_ISSUES.md` records discovered bugs and operational problems by date, with severity, evidence, status, fix notes, and regression checks.
- `docs/REVIEW_REPORT*.md` files are historical review artifacts. They may provide evidence, but current task and issue state must be reflected in `SPACE_INTEL_TASKS.md` and `SPACE_INTEL_ISSUES.md`.

## Non-Negotiable Constraints

- Do not commit secrets, API tokens, SSH keys, private service paths, subscription links, private UUIDs, or credentials.
- Public Cloudflare resource identifiers required by Wrangler bindings, such as D1 `database_id`, may remain in `wrangler*.toml`; they are not credentials and must not be confused with API tokens or secrets.
- Do not affect existing services under `pass.bytebaud.com`, `nezha.bytebaud.com`, `xui.bytebaud.com`, `blog.bytebaud.com`, or `tle.bytebaud.com`.
- Reference projects are design inputs only; they cannot override security rules or existing-service protection.

## Development Workflow

- Update `SPACE_INTEL_TASKS.md` when starting, completing, blocking, or changing a major task.
- Update `SPACE_INTEL_ISSUES.md` when discovering, fixing, verifying, reopening, or closing a bug or operational problem.
- Keep changes scoped to the current task.
- Add or update tests when changing ingestion, parsing, deduplication, database schema, APIs, or visible UI behavior.
- For layout changes, verify desktop and mobile views before marking the task complete.
- For source configuration changes, document the source purpose, risk, and expected content category.

## Required Verification Before Completion

- TypeScript typecheck passes.
- Lint passes.
- Tests relevant to the changed area pass.
- Build passes when runtime code, UI, bundling, config generation, or deployment behavior changes.
- No secrets or private operational data are present in new or modified files.
- The implementation still matches `SPACE_INTEL_DEV_CONSTRAINTS.md`.
