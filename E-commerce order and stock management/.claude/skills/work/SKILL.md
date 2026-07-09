---
name: work
description: Implement one scoped issue with tests and minimal unrelated changes.
disable-model-invocation: true
argument-hint: "<issue file or task>"
---

# Work Skill

Use this skill when an issue is clear enough to implement.

## Active Issue / Task
$ARGUMENTS

## Inputs
- One issue or task
- Acceptance criteria
- Test commands
- Relevant source files

## Procedure
1. Restate the active scope in one short paragraph.
2. Inspect the relevant files.
3. Choose the smallest behavior to implement first.
4. Write or update a failing test when practical.
5. Implement the smallest change that makes the test pass.
6. Repeat until acceptance criteria are covered.
7. Use the worker agent for isolated implementation when the task is large enough to benefit from a fresh context.
8. Run relevant checks.
9. Summarize changed files, tests run, and remaining risks.

## Rules
- Work on one issue at a time.
- Do not perform unrelated refactors.
- Do not silently add dependencies.
- Do not broaden scope without stopping and asking.
- Keep changes reviewable.