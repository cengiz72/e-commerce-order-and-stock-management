---
name: commit
description: Review current changes, verify checks, and prepare a Conventional Commit message.
disable-model-invocation: true
argument-hint: "<optional scope or push flag>"
---

# Commit Skill

## Procedure
1. Inspect git status and diff.
2. Summarize what changed.
3. Confirm relevant tests/checks were run, or clearly list what was not run.
4. Identify risks or unrelated changes.
5. Propose a Conventional Commit message.
6. Commit only when the user explicitly approves or the workflow already permits it.

## Rules
- Do not commit secrets or unrelated files.
- Do not invent test results.
- Prefer small commits that map to a coherent change.