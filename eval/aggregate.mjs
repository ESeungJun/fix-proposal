// 결과 집계: node eval/aggregate.mjs → 항목별 통과 수, 모델·조건별 합계, 함정 적발, results/summary.json
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
import fs from 'node:fs';
const rows = [];
for (const m of ['sonnet', 'haiku']) for (const c of ['base', 'skill']) {
  const d = path.join(HERE, 'results', m, c);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) rows.push(JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')));
}
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const res = {};
for (const m of ['sonnet', 'haiku']) for (const st of ['P', 'V']) {
  const items = Object.keys(rows.find((r) => r.s.startsWith(st)).grade);
  for (const it of items) for (const c of ['base', 'skill']) {
    const rs = rows.filter((r) => r.m === m && r.c === c && r.s.startsWith(st));
    (res[`${m}|${st}|${it}`] ??= {})[c] = `${rs.filter((r) => r.grade[it]?.pass).length}/${rs.length}`;
  }
}
console.log('model|stage|item  base  skill');
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(24), v.base.padEnd(6), v.skill);
console.log('\n전체 항목 통과율');
const summary = [];
for (const m of ['sonnet', 'haiku']) for (const c of ['base', 'skill']) {
  const rs = rows.filter((r) => r.m === m && r.c === c);
  let p = 0, n = 0;
  for (const r of rs) for (const v of Object.values(r.grade)) { n++; if (v.pass) p++; }
  const full = rs.filter((r) => Object.values(r.grade).every((v) => v.pass)).length;
  const avg = (k) => Math.round(rs.reduce((a, r) => a + (r[k] || 0), 0) / rs.length);
  const cost = rs.reduce((a, r) => a + (r.cost || 0), 0);
  summary.push({ m, c, p, n, full, runs: rs.length, chars: avg('chars'), out: avg('out_tokens'), cost });
  console.log(m, c, `${p}/${n} (${pct(p, n)}%)`, `만점 ${full}/${rs.length}`, `평균 글자 ${avg('chars')}`, `평균 출력토큰 ${avg('out_tokens')}`, `비용합 $${cost.toFixed(3)}`);
}
console.log('\n시나리오별 함정(trap) 적발');
for (const s of ['V1', 'V2', 'V3']) for (const m of ['sonnet', 'haiku']) {
  console.log(s, m, ['base', 'skill'].map((c) => `${c} ${rows.filter((r) => r.m === m && r.c === c && r.s === s && r.grade.trap?.pass).length}/${rows.filter((r) => r.m === m && r.c === c && r.s === s).length}`).join('  '));
}
fs.writeFileSync(path.join(HERE, 'results', 'summary.json'), JSON.stringify({ res, summary }, null, 1));
