import { readFileSync } from 'node:fs';

function parseEnvFile(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

const fileEnv = parseEnvFile('C:/Users/PC-ADMIN/Desktop/tinhoctre/apps/web/.env.local');
const env = { ...fileEnv, ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

const { createClient } = await import('@supabase/supabase-js');
const anonClient = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
const adminClient = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

const email = `probe-${Date.now()}@example.com`;
const summarize = (raw) => {
  try {
    const u = new URL(raw, 'http://localhost');
    return {
      host: u.host,
      path: u.pathname,
      queryKeys: [...u.searchParams.keys()],
      hashKeys: u.hash ? u.hash.replace(/^#/, '').split('&').map((p) => p.split('=')[0]) : [],
    };
  } catch {
    return { raw: 'unparseable' };
  }
};

try {
  const { error: signUpError } = await anonClient.auth.signUp({
    email,
    password: 'ProbePassword1!',
    options: { data: { full_name: 'Probe User' } },
  });
  if (signUpError) throw new Error(`signup: ${signUpError.message}`);
  console.log('signup ok (autoconfirm false expected: session null above)');

  const gen = await adminClient.auth.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: 'http://localhost:3100/auth/callback?next=/reset-password' },
  });
  const payload = gen.data ?? gen;
  console.log('generateLink keys:', Object.keys(payload).sort().join(','));
  console.log('action_link summary:', JSON.stringify(summarize(payload.action_link)));
  console.log('hashed_token present:', typeof payload.hashed_token === 'string' && payload.hashed_token.length > 0);
  if (payload.properties) console.log('properties keys:', Object.keys(payload.properties).sort().join(','));

  let current = payload.action_link;
  for (let i = 0; i < 5 && current; i++) {
    let res;
    try {
      res = await fetch(current, { redirect: 'manual' });
    } catch (e) {
      console.log(`hop ${i}: fetch failed (${e.cause?.code ?? e.message}) — reached non-running host`);
      break;
    }
    const location = res.headers.get('location');
    console.log(`hop ${i}: status=${res.status} location=${location ? JSON.stringify(summarize(location)) : 'none'}`);
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
    } else {
      break;
    }
  }
} catch (e) {
  console.log('PROBE ERROR:', e?.message ?? String(e));
} finally {
  const list = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = (list.data?.users ?? []).find((u) => u.email === email);
  if (found) {
    await adminClient.auth.admin.deleteUser(found.id);
    console.log('probe user cleaned up');
  }
}
