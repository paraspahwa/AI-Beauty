---
name: release-hardening-workflow
description: "Use when you need to debug a bug, harden security, add or improve GitHub Actions CI, validate the fix, and ship the change safely to main. Keywords: bug test, security enhancement, GitHub Actions, CI, lint, typecheck, unit tests, build, push to main."
---

# Release Hardening Workflow

## What This Skill Produces
A repeatable implementation workflow for taking a repo from a bug report to a validated, security-hardened change that is committed, pushed, and ready for CI enforcement.

## When To Use
Use this skill when the task combines any of the following:
- reproducing or testing a bug
- tracing a local root cause
- applying a minimal fix
- adding security checks or tightening input validation
- updating GitHub Actions workflows
- validating the change with tests, typecheck, lint, or build checks
- pushing the result to `main`

## Workflow

1. Inspect the current state first.
   - Check `git status` and the current diff.
   - Read the relevant workflow files, scripts, and nearby implementation.
   - Identify whether the repo already has CI, security jobs, or release automation.

2. Form one local hypothesis before editing.
   - State the most likely controlling code path.
   - Identify the cheapest check that could disconfirm it.
   - Prefer the smallest affected surface over broad exploration.

3. Run the cheapest useful validation.
   - Use targeted diagnostics, tests, or a narrow build/typecheck if available.
   - If local tooling is unavailable, rely on static reads and existing CI coverage.

4. Fix the root cause with the smallest safe edit.
   - Avoid broad refactors.
   - Preserve existing APIs unless the task explicitly requires a change.
   - Reuse shared helpers for repeated logic.
   - If security is involved, prefer validation, allow-lists, least privilege, and explicit failure over silent fallback.

5. Harden the delivery path.
   - Add or improve GitHub Actions to run lint, typecheck, tests, build, dependency review, and security audit where relevant.
   - Use least-privilege workflow permissions.
   - Add concurrency and cancel-in-progress for noisy branches if useful.
   - Ensure optional native dependencies are installed in CI when the build requires them.

6. Validate again after the first substantive edit.
   - Re-run the same focused check when possible.
   - Then run the next narrow verification step for the touched slice.
   - Do not expand scope until the changed behavior is confirmed.

7. Finish cleanly.
   - Review the final diff.
   - Commit with a message that describes the fix and hardening.
   - Push to `main` only after verification and when the repo policy allows it.
   - Summarize what changed, what was validated, and any remaining risk.

## Decision Points

- If a bug can be reproduced locally, fix the smallest slice that reproduces it.
- If the root cause is in shared logic, move repeated behavior into a helper.
- If CI is missing a check, add it rather than relying on manual verification.
- If the environment lacks local tooling, use static diagnostics and let GitHub Actions enforce the runtime checks.
- If a security enhancement would break flow on fallback, fail explicitly instead of silently continuing.

## Completion Checks
- The bug behavior has a clear root cause and is addressed at the source.
- Security-sensitive paths validate inputs or fail closed.
- GitHub Actions run the key checks for the repo.
- The final diff is minimal and intentional.
- The change is committed and pushed when requested.

## Example Prompts
- "Use the release-hardening workflow to fix this bug, add CI, and push to main."
- "Apply the release-hardening workflow to harden this route and add GitHub Actions checks."
- "Run the release-hardening workflow on this repo and ship the fix."
