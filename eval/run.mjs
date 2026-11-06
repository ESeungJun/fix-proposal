// A/B 실험: 같은 상황을 스킬 없이(base) / 스킬 본문을 넣고(skill) 답하게 한 뒤 Sonnet 이 채점한다.
// 사용: node eval/run.mjs            (기본: sonnet,haiku × base,skill × P1~V3 × 3회 = 72건)
//       MODELS=sonnet REPS=1 node eval/run.mjs
// 결과: eval/results/<model>/<cond>/<scenario>-<rep>.json  (이미 있는 파일은 건너뛴다)
import fs from 'node:fs';
import path from 'node:path';
import { HERE, SKILL_MD, claude, gradePrompt, parseGrade, pool, scenario } from './lib.mjs';

const E = process.env;
const MODELS = (E.MODELS || 'sonnet,haiku').split(',');
const CONDS = (E.CONDS || 'base,skill').split(',');
const SCENARIOS = (E.SC || 'P1,P2,P3,V1,V2,V3').split(',');
const REPS = Number(E.REPS || 3);
const GRADER = E.GRADER || 'sonnet';

const BASE = '너는 사용자와 함께 코드를 고치는 코딩 에이전트다. 사용자에게 보이는 글은 한국어로 쓴다.';
const SKILL = `${BASE}\n\n다음 스킬이 로드되어 있다. 이 상황에 해당하면 따른다.\n\n${SKILL_MD}`;

const jobs = [];
for (const m of MODELS) for (const c of CONDS) for (const s of SCENARIOS) for (let r = 1; r <= REPS; r++) jobs.push({ m, c, s, r });
let done = 0;
await pool(jobs, Number(E.PAR || 6), async ({ m, c, s, r }) => {
  const dir = path.join(HERE, 'results', m, c);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${s}-${r}.json`);
  if (!fs.existsSync(file)) {
    for (let t = 0; t < 2; t++) {
      try {
        const a = await claude(m, scenario(s), c === 'skill' ? SKILL : BASE);
        const g = await claude(GRADER, gradePrompt(s, a.result));
        const grade = parseGrade(g.result, a.result);
        fs.writeFileSync(file, JSON.stringify({ m, c, s, r, answer: a.result, chars: a.result.length, cost: a.total_cost_usd, out_tokens: a.usage?.output_tokens, grade }, null, 1));
        break;
      } catch (e) {
        console.error('retry', m, c, s, r, e.message);
      }
    }
  }
  console.log(++done, '/', jobs.length, m, c, s, r);
});
