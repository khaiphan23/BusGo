import { readFileSync, writeFileSync } from 'node:fs';

const FILES = [
  'C:/Users/PC-ADMIN/Desktop/tinhoctre/.env.local',
  'C:/Users/PC-ADMIN/Desktop/tinhoctre/packages/db/.env',
  'C:/Users/PC-ADMIN/Desktop/tinhoctre/apps/web/.env.local',
];

const KEY_NAME = 'SUPABASE_SERVICE_ROLE_KEY';

function extract(text) {
  const m = new RegExp(`^${KEY_NAME}=(.*)$`, 'm').exec(text);
  return m ? m[1] : null;
}

function payloadOf(jwt) {
  const parts = jwt.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'not-3-part-jwt' };
  try {
    return { ok: true, claims: JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')), parts };
  } catch {
    return { ok: false, reason: 'payload-json-broken', parts };
  }
}

const originals = FILES.map((f) => ({ file: f, text: readFileSync(f, 'utf8'), value: extract(readFileSync(f, 'utf8')) }));
const distinct = [...new Set(originals.map((o) => o.value))];
console.log('copies found:', originals.length, 'distinct values:', distinct.length);

const broken = originals.find((o) => !payloadOf(o.value).ok);
let repaired = null;
if (broken) {
  const { parts } = payloadOf(broken.value);
  const decoded = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  // The stored payload is valid JSON except for a missing quote after "exp".
  const fixed = decoded.replace(/"exp:(\d+)\}$/, '"exp":$1}');
  if (fixed === decoded) throw new Error('unrecognised corruption shape — manual fix required');
  const claims = JSON.parse(fixed);
  const b64 = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  repaired = `${parts[0]}.${b64}.${parts[2]}`;
  const check = payloadOf(repaired);
  if (!check.ok || check.claims.role !== 'service_role') throw new Error('reconstruction failed validation');
  console.log('reconstructed service-role key: payload now valid JSON, role=service_role');
} else {
  console.log('service-role key already valid — no change');
}

const url = /NEXT_PUBLIC_SUPABASE_URL=(.*)/m.exec(originals[2].text)[1].trim().replace(/^["']|["']$/g, '');
const verifyKey = repaired ?? originals[2].value;
const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1`, {
  headers: { apikey: verifyKey, Authorization: `Bearer ${verifyKey}` },
});
console.log('live admin verification status:', res.status);
if (res.status !== 200) throw new Error('repaired key does not validate — aborting, files untouched');

if (repaired) {
  for (const o of originals) {
    if (payloadOf(o.value).ok) continue;
    const next = o.text.replace(new RegExp(`^${KEY_NAME}=.*$`, 'm'), `${KEY_NAME}=${repaired}`);
    writeFileSync(o.file, next);
    console.log('repaired:', o.file);
  }
}
console.log('done');
