---
name: diagnose
description: Diagnose failed tests, runtime errors, and surprising behavior before attempting a fix.
disable-model-invocation: true
argument-hint: "<error, failing command, or symptom>"
---

# Diagnose Skill

## Procedure
1. Reproduce the failure or identify the smallest failing command.
2. Capture the exact error output.
3. List the most likely hypotheses.
4. Test one hypothesis at a time.
5. Add a regression test when possible.
6. Apply the smallest safe fix.
7. Run the nearest relevant tests, then broader checks if needed.

## Rules
- Do not rewrite large areas before understanding the failure.
- Do not suppress errors to make tests pass.
- Do not fix unrelated issues in the same pass.