---
name: plan
description: Clarify requirements and turn broad work into small implementation issues.
disable-model-invocation: true
argument-hint: "<feature idea or task>"
---

# Plan Skill

Use this skill when the request is unclear, broad, risky, or larger than one small implementation step.

## User Request
$ARGUMENTS

## Inputs
- User request or feature idea
- Existing README / docs / issues / ADRs
- Relevant source files when needed

## Procedure
1. Read existing project context before proposing a plan.
2. Identify the goal, users, constraints, non-goals, and unknowns.
3. Ask only the most important clarification questions.
4. If deeper isolated research is useful, dispatch or ask for help from the planner agent.
5. Convert the work into small vertical-slice issues.
6. For each issue, include:
   - title
   - user story or behavior
   - acceptance criteria
   - test expectations
   - out of scope
   - suggested owner/agent

## Rules
- Do not implement code while planning.
- Do not create horizontal tasks like "create database layer" unless explicitly required.
- Prefer tracer-bullet issues that produce visible behavior.
- Separate facts, assumptions, and open questions.