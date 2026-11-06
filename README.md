<div align="center">

# 🔧 fix-proposal

**Stop asking your agent "so what's wrong, and what do we get if we fix it?"**

A Claude Code skill. Bug reports and proposals come in four parts: **what's wrong · how to fix it · what gets better · the expected result**.
After the fix, an **as-is / to-be checklist** checks each promise against measurements.

[![License: MIT](https://img.shields.io/badge/license-MIT-black)](LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)](#install)

English · [한국어](README.ko.md)

📝 Story behind it: [Medium](https://medium.com/@haul/only-10-of-my-ai-agents-34-bug-reports-said-what-the-fix-would-improve-fd0f98c777c4) · [velog (Korean)](https://velog.io/@haul/fix-proposal-agent-bug-report-skill)

</div>

## At a glance

Real answers from Haiku to the same situation, a report after a search-box fix ([raw](eval/results/haiku)). Translated:

```text
without  Requests: I said "12 → 1", it's actually 2.
         If typing doesn't pause, it drops to 1.          ← never measured, stated as fact

with     |               | as-is | to-be | check |
         | requests 12→1 | 12    | 2     | ❌    |
         The "1" assumed typing without a pause.
```

## Why

The agent reported a bug like this:

> `queryReadOnly` lacks `--read-only`, so the Supabase CLI stops when an agent runs it. I can fix it if you like.

So the user had to ask:

> So what's the problem now, and what's better once it's fixed?

The full answer: two scripts that use the function had never run in agent sessions. The "read-only" function also let a table-creating `select … into` through. The first report mentioned neither.

"Fixed" reports were often followed by lines like these:

> "The side margins weren't applied at all" (2026-10-13) · "It still shows this" (2026-11-03) · "The effect is still really awkward" (2026-10-09)

## Numbers

### 1. Real history, before the skill

From 87 projects (2026-09-28 to 11-06), 40 proposals and 40 "fixed" reports were sampled at random and graded ([result](eval/history/result.json)).

| Proposals (34) | | "Fixed" reports (38) | |
|---|---|---|---|
| Where the problem is | 82% | **Measured before the fix** | **24%** |
| How to fix | 82% | Measured after the fix | 47% |
| **What gets better** | **29%** | **Each promise checked** | **32%** |
| **Checkable expected result** | **18%** | | |

### 2. A/B: same situation, with and without the skill

- **Situations:** 6 in total, 3 proposals and 3 post-fix reports ([scenarios](eval/scenarios)).
- **Traps:** each report hides at least one promise that wasn't met or wasn't measured.
- **Runs:** Sonnet and Haiku, 3 runs each, 72 answers in all. Every run used `claude -p` with settings, CLAUDE.md and tools off.
- **Grading:** a separate Sonnet, quoting evidence from each answer ([rubric](eval/rubric.json)).

| Item | Without | With |
|---|---|---|
| What gets better | 50% | **100%** |
| Checkable expected result | 28% | **100%** |
| Catches every trap | 83% | **100%** |
| Doesn't claim the unmeasured | 61% | **78%** |
| **All items** | **85%** | **98%** |
| **Perfect answers** | **33%** | **89%** |

| Model | All items (without → with) | Cost per answer (without → with) |
|---|---|---|
| Sonnet | 85% → 98% | $0.014 → $0.024 |
| Haiku | 85% → 98% | $0.0013 → $0.0018 |

**Haiku with the skill (98%) beat Sonnet without it (85%), at one eighth of the cost.**

The same answers were graded a second time. The two gradings agreed **95.3%** of the time and reached the same conclusion ([result](eval/results/regrade.json)).

### 3. Applied for real: reporting the fix of the bug above

| Promise | as-is | to-be | check |
|---|---|---|---|
| Read function works | `select 1` fails | `[{"x":1}]` | ✅ |
| Scripts using it work | stops at the first query | 229 games, 7,752 picks processed | ✅ |
| DB blocks writes | `select … into` passes | refused: `read-only transaction` | ✅ |
| Error shows the cause | always "check the DB URL" | `relation "nope_tbl" does not exist` | ✅ |
| Works from a human terminal | not run | not run | ⚠️ |

## Why it works

- **Required fields stop omissions.** Agents already give the location and the fix. What they drop is "so what's the benefit".
- **The expected result becomes the test.** What to check is decided before the fix, so the agent can't report only what is easy to check afterwards.
- **As-is is measured first.** You can't measure "before" after the code is fixed. Measuring first turns "better" into a number.
- **✅ needs evidence.** ❌ and ⚠️ give "partly" and "not measured" a place, so they don't get hidden.

## Install

```text
/plugin marketplace add ESeungJun/fix-proposal
/plugin install fix-proposal@fix-proposal
```

Or install it with skills.sh:

```bash
npx skills add https://github.com/ESeungJun/fix-proposal/tree/main/plugins/fix-proposal/skills/fix-proposal
```

To make it always apply, add this line to `~/.claude/CLAUDE.md`:

```markdown
- 버그·개선을 말하거나 승인받아 고친 뒤 보고할 때는 `fix-proposal` 스킬 형식을 따른다.
```

## Measure it yourself

You need the `claude` CLI signed in and Node.js 20 or newer.

```bash
node eval/run.mjs            # the 72-answer A/B
node eval/aggregate.mjs      # totals
node eval/regrade.mjs        # grading agreement
node eval/history/audit.mjs  # audit your own history (totals only)
```

## License

[MIT](LICENSE)
