// 실험에 쓰는 공통 부품. claude CLI 를 격리 모드로 부른다:
// 빈 폴더에서, 설정·CLAUDE.md·스킬·도구 없이(--setting-sources '' --disable-slash-commands --tools '').
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const EMPTY = path.join(HERE, '.empty');
fs.mkdirSync(EMPTY, { recursive: true });

export const RUBRIC = JSON.parse(fs.readFileSync(path.join(HERE, 'rubric.json'), 'utf8'));
export const KEY = JSON.parse(fs.readFileSync(path.join(HERE, 'key.json'), 'utf8'));
export const SKILL_MD = fs.readFileSync(path.join(HERE, '..', 'plugins', 'fix-proposal', 'skills', 'fix-proposal', 'SKILL.md'), 'utf8');
export const scenario = (id) => fs.readFileSync(path.join(HERE, 'scenarios', `${id}.md`), 'utf8');
export const itemsFor = (id) => (id.startsWith('P') ? RUBRIC.proposal : RUBRIC.report);

/** claude -p 한 번. 결과 JSON(result, usage, total_cost_usd)을 돌려준다 */
export function claude(model, input, systemPrompt) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--model', model, '--setting-sources', '', '--disable-slash-commands', '--no-session-persistence', '--tools', '', '--output-format', 'json'];
    if (systemPrompt) args.push('--system-prompt', systemPrompt);
    const p = spawn('claude', args, { cwd: EMPTY });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => {
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error(`claude exit ${code}: ${err.slice(0, 300)}`));
      }
    });
    p.stdin.end(input);
  });
}

export function gradePrompt(id, answer) {
  return `너는 엄격한 채점자다. 아래 [상황]에서 에이전트가 쓴 [답]을 항목별로 채점한다. 각 항목은 [답]에서 근거 문장을 그대로 인용할 수 있을 때만 true 다. 인용은 [답]에 실제로 있는 글자여야 한다.

[정답표]
${JSON.stringify(KEY[id])}

[항목]
${Object.entries(itemsFor(id)).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[상황]
${scenario(id)}

[답]
${answer}

JSON 하나만 출력: {"<항목>": {"pass": true|false, "quote": "<근거 인용 또는 빈 문자열>"}, ...}`;
}

/** 채점 모델의 JSON 을 읽고, 인용이 답에 실제로 없으면 pass 를 false 로 바꾼다 */
export function parseGrade(text, answer) {
  const g = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
  const flat = answer.replace(/\s+/g, ' ');
  for (const v of Object.values(g)) {
    if (v && v.pass && v.quote && !flat.includes(v.quote.replace(/\s+/g, ' ').slice(0, 40))) {
      v.pass = false;
      v.note = 'quote not found';
    }
  }
  return g;
}

export async function pool(jobs, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < jobs.length) await fn(jobs[i++]);
  }));
}
