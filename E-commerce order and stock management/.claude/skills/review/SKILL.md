---
name: review
description: Review a diff for correctness, scope, tests, architecture, and documentation.
disable-model-invocation: true
argument-hint: "<base branch, diff, issue, or PR URL>"
---

# Review Skill

Use this skill before marking work complete or before commit/PR.

## Inputs
- Git diff
- Active issue / acceptance criteria
- Test results
- Relevant docs

## Review Checklist
1. Does the diff satisfy the acceptance criteria?
2. Are there unrelated changes?
3. Are tests meaningful and behavior-focused?
4. Did typecheck/lint/build pass?
5. Is business logic placed in the right module?
6. Were docs updated when behavior, commands, or architecture changed?
7. Are there security, data, or migration risks?
8. If the diff is non-trivial, dispatch or ask for help from the reviewer agent.

## Output Format
- Summary
- Must fix
- Should fix
- Nice to have
- Tests run
- Final recommendation: approve / request changes / blocked

## Rules
- Be stricter with correctness than style.
- Do not approve untested behavior.
- Do not hide uncertainty.