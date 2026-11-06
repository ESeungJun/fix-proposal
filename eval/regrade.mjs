// 채점 신뢰도: results/ 의 답을 독립된 채점 호출로 한 번 더 채점해 첫 채점과 항목별로 얼마나 일치하는지 잰다.
// 사용: node eval/regrade.mjs  → eval/results/regrade.json
import fs from 'node:fs';
import path from 'node:path';
import { HERE, KEY, claude, itemsFor, pool, scenario } from './lib.mjs';

// 첫 채점과 다른 형식(인용 없이 참·거짓만)으로 묻는다. 같은 결론이 나오는지가 신뢰도다
const regradePrompt = (id, answer) => `너는 엄격한 채점자다. 아래 [상황]에서 에이전트가 쓴 [답]을 항목별로 채점한다. 각 항목은 [답]에서 근거 문장을 그대로 인용할 수 있을 때만 true 다.

[정답표]
${JSON.stringify(KEY[id])}

[항목]
${Object.entries(itemsFor(id)).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[상황]
${scenario(id)}

[답]
${answer}

JSON 하나만 출력: {"<항목>": true|false, ...}`;

const files = [];
for (const m of fs.readdirSync(path.join(HERE, 'results'))) {
  const md = path.join(HERE, 'results', m);
  if (!fs.statSync(md).isDirectory()) continue;
  for (const c of fs.readdirSync(md)) for (const f of fs.readdirSync(path.join(md, c))) files.push(path.join(md, c, f));
}
const pairs = [];
await pool(files, 6, async (f) => {
  const r = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let t = 0; t < 2; t++) {
    try {
      const text = (await claude('sonnet', regradePrompt(r.s, r.answer))).result;
      const g = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
      for (const k of Object.keys(itemsFor(r.s))) pairs.push({ m: r.m, c: r.c, s: r.s, k, first: !!r.grade[k]?.pass, second: !!g[k] });
      break;
    } catch {}
  }
});
const agree = pairs.filter((p) => p.first === p.second).length;
const passRate = (c, key) => { const x = pairs.filter((p) => p.c === c); return `${x.filter((p) => p[key]).length}/${x.length}`; };
const summary = { judgments: pairs.length, agree, agreement: +(agree / pairs.length).toFixed(3), first: { base: passRate('base', 'first'), skill: passRate('skill', 'first') }, second: { base: passRate('base', 'second'), skill: passRate('skill', 'second') } };
fs.writeFileSync(path.join(HERE, 'results', 'regrade.json'), JSON.stringify({ summary, pairs }, null, 1));
console.log(summary);
