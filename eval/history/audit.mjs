// 내 Claude Code 대화 기록 감사: 지금까지 에이전트가 보낸 "버그·개선 제안"과 "고쳤다는 보고"가
// 스킬의 기준을 얼마나 채웠는지 표본을 뽑아 Sonnet 으로 채점한다. 원문은 이 컴퓨터 밖으로 저장하지 않고 집계만 출력한다
// (채점하려고 claude CLI 에는 보낸다 — 평소 쓰는 모델 백엔드와 같다).
// 사용: node eval/history/audit.mjs [--before 2026-11-06T05:30] [--n 40] [--root ~/.claude/projects]
// 한계: 제안·보고를 고르는 정규식이 한국어 표현만 본다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { claude, pool } from '../lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = arg('--root', path.join(os.homedir(), '.claude', 'projects'));
const BEFORE = arg('--before', '9999');
const N = Number(arg('--n', 40));

const texts = [];
for (const d of fs.readdirSync(ROOT)) {
  let files = [];
  try { files = fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith('.jsonl')); } catch { continue; }
  for (const f of files) {
    let lines = [];
    try { lines = fs.readFileSync(path.join(ROOT, d, f), 'utf8').split('\n'); } catch { continue; }
    for (const l of lines) {
      let j;
      try { j = JSON.parse(l); } catch { continue; }
      if (j.type !== 'assistant' || j.isSidechain) continue;
      const t = (j.message?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
      if (t.length > 200 && (j.timestamp || '') < BEFORE) texts.push({ proj: d, t });
    }
  }
}
const PROP = (t) => /(버그|문제|원인|개선|결함)/.test(t) && /(고칠까요|진행할까요|수정할까요|원하시면 고|몇 번을 고|고칠지|어떻게 할까요)/.test(t);
const DONE = (t) => /(고쳤습니다|수정했습니다|해결했습니다|고쳤어요|수정했어요)/.test(t) && !PROP(t);
let seed = 20261106;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const sample = (arr) => { const c = [...arr]; for (let i = c.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [c[i], c[k]] = [c[k], c[i]]; } return c.slice(0, N); };
const prop = texts.filter((x) => PROP(x.t));
const done = texts.filter((x) => DONE(x.t));
console.log(`assistant texts ${texts.length}, projects ${new Set(texts.map((x) => x.proj)).size}, proposals ${prop.length}, done reports ${done.length}`);

const ITEMS = {
  prop: { loc: '문제 위치를 파일:줄·화면·명령 수준으로 짚는다', evidence: '실제 실행·재현 결과(출력·수치)를 근거로 든다', fix: '고치는 방법이 구체적이다', benefit: '고치면 기존보다 무엇이 나아지는지를 구체적으로 비교한다(막연한 표현만이면 false)', expected: '고친 뒤 확인할 수 있는 예상 결과를 검증 가능한 문장으로 쓴다', all4: '위 benefit·expected·fix·loc 이 한 제안 안에 모두 있다' },
  done: { before: '고치기 전 상태를 실측(실행 결과·수치)으로 적는다', after: '고친 뒤 상태를 실측(실행 결과·수치·테스트 통과 수)으로 적는다', perClaim: '앞서 약속·의도한 효과를 항목별로 실제로 됐는지 대조한다', limits: '확인 못 한 범위나 안 된 부분을 밝힌다(전부 됐다고만 하면 false)' },
};
const graded = { prop: [], done: [] };
const jobs = [...sample(prop).map((x) => ['prop', x]), ...sample(done).map((x) => ['done', x])];
await pool(jobs, 6, async ([k, x]) => {
  const prompt = `너는 엄격한 채점자다. 아래는 코딩 에이전트가 사용자에게 실제로 보낸 ${k === 'prop' ? '버그·개선 제안' : '수정 완료 보고'} 하나다. 항목마다 글에서 근거를 그대로 인용할 수 있을 때만 true.\n[항목]\n${Object.entries(ITEMS[k]).map(([a, b]) => `- ${a}: ${b}`).join('\n')}\n- relevant: 이 글이 실제로 ${k === 'prop' ? '버그·개선을 제안하는 글' : '무언가를 고친 결과를 보고하는 글'}이 맞다\n\n[글]\n${x.t.slice(0, 6000)}\n\nJSON 하나만: {"<항목>": true|false, ...}`;
  for (let t = 0; t < 2; t++) {
    try { graded[k].push(JSON.parse((await claude('sonnet', prompt)).result.match(/\{[\s\S]*\}/)[0])); break; } catch {}
  }
});
const summary = {};
for (const k of ['prop', 'done']) {
  const rel = graded[k].filter((g) => g.relevant);
  summary[k] = { sampled: graded[k].length, relevant: rel.length };
  for (const it of Object.keys(ITEMS[k])) summary[k][it] = `${rel.filter((g) => g[it]).length}/${rel.length}`;
}
console.log(JSON.stringify(summary, null, 1));
