<div align="center">

# 🔧 fix-proposal

**Stop your agent from making you ask "so what's broken, and what do we get if we fix it?"**

A Claude Code skill. When the agent reports a bug or suggests an improvement, it fills four fields: **what is wrong now · how to fix it · what gets better · the expected result**. After you approve and it fixes the problem, it checks every promise with an **as-is / to-be checklist** of measured results.

[![License: MIT](https://img.shields.io/badge/license-MIT-black)](LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)](#install)

English · [한국어](README.ko.md)

</div>

> The skill text and every measurement below are in Korean. Effects in English conversations were not measured.

## At a glance

Two real answers to the same situation, a report after fixing a search-box debounce, from Haiku without and with the skill ([raw](eval/results/haiku)). Translated:

```text
┌─ without the skill ───────────────────────────────────────
│ Requests: I said "12 down to 1", but it is actually 2.
│ ... This is expected; if typing does not pause, it drops to 1.   ← never measured, stated as fact
└──────────────────────────────────────────────────────────
┌─ with the skill ──────────────────────────────────────────
│ |                    | as-is | to-be                      | check |
│ | 12 requests → 1    | 12    | 2 (`아이폰`, `아이폰 케이스`)  | ❌    |
│ The "1" assumed typing with no pause longer than 300 ms.
└──────────────────────────────────────────────────────────
```

Both answers said the "results within 300 ms" claim was not measured. They split on the one line above.

## Why it exists

These are real cases from the author's own Claude Code projects.

**2026-11-06, a data script bug.** The agent ended its work with this report:

> `queryReadOnly` in `scripts/combos/lib/match-log.mjs` lacks `--read-only`, so the Supabase CLI stops and asks for confirmation when an agent runs it. … I can open an issue and fix it if you like.

It gave the location and the fix, but not what breaks if you leave it or what improves if you fix it. The user had to ask:

> So what's the problem before it's fixed, and what's better after?

The answer turned out to be bigger than the report suggested:
- Two scripts that use the function **had not run at all** in agent sessions.
- The "read-only" function let `select … into`, a statement that creates a table, straight through.

**"Fixed", but it wasn't.** Lines left in the same period's chat history:

> "Looks like the side margins weren't applied at all. Check the code properly and test it on the device." (2026-10-13)
>
> "It still shows this." (2026-11-03, after a macOS signing warning was reported fixed)
>
> "The effect is still really awkward." (2026-10-09)

## Numbers

### 1. Audit of real history, before the skill

The audit covers 2026-09-28 to 2026-11-06 across 87 projects: 248 bug or improvement proposals and 326 "fixed it" reports from the agent.
- 40 of each were drawn with a fixed seed.
- Sonnet graded them. Only texts that really were proposals or reports were counted.
- Files: [result](eval/history/result.json), [script](eval/history/audit.mjs).

| Proposals (34) | Share that included it |
|---|---|
| Where the problem is | 82% (28) |
| Observed output as evidence | 68% (23) |
| How to fix | 82% (28) |
| **What gets better** | **29% (10)** |
| **A checkable expected result** | **18% (6)** |
| All four of where, how, benefit, expected | **12% (4)** |

| "Fixed" reports (38) | Share that included it |
|---|---|
| **Measured state before the fix** | **24% (9)** |
| Measured state after the fix | 47% (18) |
| **Each promised effect checked one by one** | **32% (12)** |
| Says what was not verified | 76% (29) |

The agent usually says where the problem is. It says what improves only three times in ten, and how to tell that the fix worked only twice in ten. Only one report in four compares against the state before the fix.

### 2. A/B: same situation, with and without the skill

- **Situations:** 6 ([`eval/scenarios`](eval/scenarios)).
  - Three proposals: a data script, a web search box, an Android date label.
  - Three reports after fixing them.
  - Each report hides at least one trap: a promise that the measurements show was not met, or was never measured.
- **Conditions:** the baseline is one line, "you are a coding agent, reply in Korean". The skill condition adds the `SKILL.md` text to that line.
- **Runs:** Sonnet and Haiku, 3 times each, 72 answers in total.
  - Each run used `claude -p` in an empty directory with settings, CLAUDE.md, skills and tools all off.
  - We checked that the skill did not leak into the baseline.
- **Grading:** a separate Sonnet graded each item against the [rubric](eval/rubric.json) and had to quote the answer.
  - Code fails any item whose quote is not actually in the answer.
  - [`key.json`](eval/key.json) lists the unknowns and traps for each situation.

| Item (both models, 18 runs each) | Without | With |
|---|---|---|
| **What gets better, concretely** | 9/18 (50%) | **18/18 (100%)** |
| **A checkable expected result** | 5/18 (28%) | **18/18 (100%)** |
| Location down to file:line | 16/18 | 18/18 |
| **Catches every trap** | 15/18 (83%) | **18/18 (100%)** |
| Does not claim what was not measured | 11/18 (61%) | 14/18 (78%) |
| Checks each promise one by one | 17/18 | 18/18 |
| Quotes evidence, concrete fix, names unknowns, asks before fixing, measures before and after, reports regression tests | 18/18 each | 18/18 each |
| **All items** | **199/234 (85%)** | **230/234 (98%)** |
| **Answers with a perfect score** | **12/36 (33%)** | **32/36 (89%)** |

| | All items | Perfect | Traps caught | Avg length | Cost per answer |
|---|---|---|---|---|---|
| Sonnet, without | 100/117 (85%) | 5/18 | 8/9 | 1,173 chars | $0.0141 |
| Sonnet, with | 115/117 (98%) | 16/18 | 9/9 | 1,812 (+54%) | $0.0240 |
| Haiku, without | 99/117 (85%) | 7/18 | 7/9 | 1,400 | $0.0013 |
| Haiku, with | 115/117 (98%) | 16/18 | 9/9 | 1,754 (+25%) | $0.0018 |

- Costs are the API prices recorded in the runs. Grading is excluded.
- **Haiku with the skill (98%, 16/18 perfect) beat Sonnet without it (85%, 5/18), at about one eighth of the cost per answer.**

**Is the grading reliable?** The same 72 answers were graded again with a different prompt that asks for true/false only, without quotes ([result](eval/results/regrade.json)).
- 446 of 468 judgments matched (**95.3% agreement**).
- The second grading alone gives 200/234 (85%) without the skill and 233/234 (99.6%) with it, the same conclusion.

### 3. Applied for real: the data script bug above

This is the report after re-proposing in the skill's format, getting approval and fixing it. The as-is values were measured by stashing the fix and running the same commands.

| Promise | as-is (measured) | to-be (measured) | check |
|---|---|---|---|
| The read function works again | `select 1` fails | `[{"x":1}]`, a count on the real table (111) works too | ✅ |
| Scripts using it run again | stops at the first query | processes 229 games and 7,752 picks to the end | ✅ |
| The DB blocks writes the word filter misses | `select … into` passes the filter | CLI refuses with `cannot execute SELECT INTO in a read-only transaction` | ✅ |
| The error message stops hiding the cause | always "check the DB URL" | e.g. `relation "nope_tbl" does not exist` (connection string removed) | ✅ |
| It also works from a human terminal | not run | not run | ⚠️ not verified |

Regression: 274/274 tests pass. Anything not measured, like the last row, stays ⚠️.

## Why it works

What the numbers show, grouped by cause:

1. **Empty fields stop omissions.** Agents already state location and fix (82% in the audit). What they drop is "so what's the benefit". With four required fields, benefit went from 50% to 100% and expected result from 28% to 100%.
2. **The expected result becomes the test.** The skill asks for checkable sentences such as "`select 1` returns one row". That sentence becomes a row of the to-be table, so what to check is fixed before the fix. The agent can no longer report only what happens to be easy to check.
3. **As-is is measured first.** You cannot measure "before" once the code is fixed, so the skill asks for it first. That makes "better" a number. In the audit only 24% of reports had a measured before state.
4. **✅ needs evidence.** Three marks (✅ ❌ ⚠️) leave room for "partly" and "not measured". Trap detection went from 83% to 100%.
5. **Smaller models gain more.** Haiku also improved on locating the problem (7/9 → 9/9) and on traps (7/9 → 9/9). The format carries part of the judgment.

## Limits

- **Measured with the skill forced into the prompt.** How often Claude loads the skill on its own was not measured. Add one line to `CLAUDE.md` to make it always apply (see Install).
- **Small sample.** 6 situations × 3 runs × 2 models, and the author wrote the situations. Only the report text was graded, not the whole fix.
- **The grader is a model.** Agreement between two gradings is 95.3%.
- **Some overclaiming remains.** "Does not claim what was not measured" is 14/18 with the skill. All four failures are in one situation (V2):
  - a before state written into the table that the logs never showed ("no cancellation, all 12 ran")
  - a verdict on something never measured ("structurally this promise was wrong")
- **Longer and costlier.** Answers grow by 25 to 54%. With Sonnet, cost per answer goes from $0.014 to $0.024.
- **Korean only.** The skill text and the audit's regexes are Korean.

## Install

**Claude Code plugin**

```text
/plugin marketplace add ESeungJun/fix-proposal
/plugin install fix-proposal@fix-proposal
```

**Any agent that reads skills** (via [skills.sh](https://skills.sh))

```bash
npx skills add https://github.com/ESeungJun/fix-proposal/tree/main/plugins/fix-proposal/skills/fix-proposal
```

**Manual copy**

```bash
mkdir -p ~/.claude/skills/fix-proposal
curl -fsSL https://raw.githubusercontent.com/ESeungJun/fix-proposal/main/plugins/fix-proposal/skills/fix-proposal/SKILL.md -o ~/.claude/skills/fix-proposal/SKILL.md
```

**To make it always apply** (recommended), add this line to `~/.claude/CLAUDE.md`:

```markdown
- 버그·개선을 말하거나 승인받아 고친 뒤 보고할 때는 `fix-proposal` 스킬 형식을 따른다(제안: 지금 문제·고치는 방법·나아지는 점·예상 결과 / 고친 뒤: as-is·to-be 체크리스트로 실측 검증).
```

## Measure it yourself

You need the `claude` CLI signed in (runs on your plan) and Node.js 20 or newer.

```bash
node eval/run.mjs                 # the 72-answer A/B (skips existing results; delete eval/results/<model> to re-run)
node eval/aggregate.mjs           # per-item table, traps, cost
node eval/regrade.mjs             # grading agreement
node eval/history/audit.mjs       # audit your own history (~/.claude/projects); prints totals only, saves no text
```

## License

[MIT](LICENSE)
