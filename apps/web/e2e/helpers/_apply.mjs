import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function parseEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const fileEnv = parseEnvFile('C:/Users/PC-ADMIN/Desktop/tinhoctre/apps/web/.env.local');
const file = process.argv[2];
if (!file) throw new Error('usage: node _apply.mjs <sql-file>');

const res = spawnSync(
  'pnpm',
  ['exec', 'prisma', 'db', 'execute', '--file', file, '--schema', 'packages/db/prisma/schema.prisma'],
  {
    cwd: 'C:/Users/PC-ADMIN/Desktop/tinhoctre',
    env: { ...process.env, ...fileEnv },
    stdio: 'inherit',
    shell: true,
  }
);
process.exit(res.status ?? 1);
