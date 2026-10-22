import { readFileSync } from 'node:fs';

const env = {};
for (const line of readFileSync('C:/Users/PC-ADMIN/Desktop/tinhoctre/apps/web/.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`, {
  method: 'POST',
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: `hdr-${Date.now()}@busgo-e2e.test`,
    password: 'ProbePassword1!',
    data: { full_name: 'Probe' },
  }),
});
console.log('status', res.status);
const headers = Object.fromEntries([...res.headers.entries()]);
for (const [k, v] of Object.entries(headers)) {
  if (/rate|retry|limit/i.test(k)) console.log('header', k, '=', v);
}
const body = await res.json().catch(() => ({}));
console.log('body keys', Object.keys(body));
console.log('error code/message:', JSON.stringify({ code: body.error_code ?? body.code, msg: (body.msg ?? body.message ?? '').slice(0, 120) }));
