name: spec-kit-release-hardening
description: "Use when you need a spec-kit-style workflow for the entire AI-Beauty website or similar repos: debug a bug, harden security, add GitHub Actions CI, validate the change, and ship it safely to main. Keywords: spec, plan, tasks, implementation, verification, security, GitHub Actions, bug test, push to main, website pages, repo-wide."
---

# Spec-Kit Release Hardening

## What This Skill Produces
A spec-first release workflow that turns a bug report or hardening request into a small, validated, security-conscious implementation and a clean push to `main`.

## When To Use
Use this skill when the task needs a structured sequence:
- define the problem clearly
- choose the smallest safe scope
- implement in traceable slices
- add or update CI and security checks
- validate the result before shipping

This skill is intended for website-wide work. Apply it when the request may touch one or more pages of the website, plus routes, components, shared libraries, scripts, workflows, or other code shared across pages.

Typical fit:
- landing page, upload page, report page, studio page, dashboard pages, auth pages, and admin pages
- route or API bug fixes
- security hardening in request handlers or workflow files
- GitHub Actions updates for lint, tests, typecheck, build, dependency review, or audit
- shipping a change that should be committed and pushed once verified

## Workflow

1. Capture the spec.
   - Restate the problem in one sentence.
   - Identify the expected outcome and any non-goals.
   - Note the files, routes, workflows, or tests most likely involved.
   - If the request is underspecified, ask one focused question before editing.

2. Plan the work.
   - Break the request into small tasks.
   - Separate behavior fixes, security hardening, and CI updates.
   - Decide which tasks are required before shipping and which are optional follow-ups.
   - Prefer a plan that can be validated in one narrow slice at a time.

3. Inspect the implementation surface.
   - Read the relevant files first.
   - Trace the controlling code path instead of broad repo exploration.
   - Form one local hypothesis about the bug or weakness.
   - Pick the cheapest check that could disconfirm it.
   - Prefer the owner abstraction, nearby route, or existing test before widening scope.

4. Implement the smallest viable slice.
   - Prefer shared helpers over duplicated logic.
   - Keep APIs stable unless the spec calls for a change.
   - Fail closed on security-sensitive paths.
   - If CI or automation is part of the request, add it in the same slice when possible.
   - Avoid unrelated refactors or formatting-only edits.

5. Verify after each meaningful edit.
   - Re-run the narrowest useful check for the touched area.
   - Then run the next closest validation step.
   - If a check fails, repair the same slice before widening scope.
   - Use static diagnostics when local tooling is unavailable.
   - Treat a failing check as a signal to repair the current slice before moving on.

6. Harden delivery.
   - Add or update GitHub Actions for lint, typecheck, tests, build, dependency review, and security audit where relevant.
   - Use least-privilege workflow permissions.
   - Add concurrency controls if the workflow should cancel redundant runs.
   - Make optional build dependencies explicit in CI.
   - Keep workflows deterministic and avoid silent fallbacks in security gates.

7. Ship cleanly.
   - Review the final diff for scope drift.
   - Commit with a message that reflects the user-facing outcome.
   - Push to `main` only after the implementation and validation complete.
   - Summarize what changed, what was verified, and what remains risky.
   - If the repo is already committed or pushed, do not rewrite history unless explicitly requested.

## Decision Rules
- If the spec is unclear, ask one focused question before editing.
- If a bug can be reproduced, fix the path that reproduces it first.
- If the root cause is shared, extract a helper rather than patching every caller.
- If a security enhancement would allow silent fallback, prefer explicit rejection.
- If CI is missing a guardrail, add it instead of relying on manual review.
- If local tooling is unavailable, rely on static inspection and GitHub Actions for runtime enforcement.

## Completion Criteria
- The original problem has a concrete root cause and is fixed.
- Security-sensitive paths validate input or fail closed.
- GitHub Actions cover the important checks for the repo.
- The final patch is minimal and reviewable.
- The work is committed and pushed when requested.

## Example Prompts
- "Use the spec-kit-release-hardening workflow to fix this bug and add CI."
- "Run the spec-kit-release-hardening workflow on this route and push to main."
- "Apply the spec-kit workflow: spec, plan, implement, verify, ship."
