import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire('C:/Users/PC-ADMIN/Desktop/tinhoctre/package.json');

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
process.env.DATABASE_URL ??= fileEnv.DATABASE_URL;
process.env.DIRECT_URL ??= fileEnv.DIRECT_URL;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/** Runs an insert then forces a rollback so nothing ever persists. */
async function probeInsert(label, sql) {
  let outcome = null;
  try {
    await prisma.$transaction(async (tx) => {
      try {
        await tx.$executeRawUnsafe(sql);
        outcome = 'SUCCEEDED';
      } catch (e) {
        outcome = e.message;
      }
      throw new Error('__force_rollback__');
    });
  } catch (e) {
    if (e.message !== '__force_rollback__') console.log(`${label}: tx machinery error: ${e.message}`);
  }
  console.log(`${label}: ${outcome}`);
}

try {
  const cols = await prisma.$queryRawUnsafe(
    `select column_name, is_nullable, column_default, data_type
     from information_schema.columns
     where table_schema = 'public' and table_name = 'users'
     order by ordinal_position`
  );
  console.log('public.users columns:');
  for (const c of cols) console.log('  ' + JSON.stringify(c));

  const uuid = await prisma.$queryRawUnsafe(`select gen_random_uuid()::text as ok`);
  console.log('gen_random_uuid available:', JSON.stringify(uuid));

  await probeInsert(
    'insert WITHOUT id (what the trigger does)',
    `insert into public.users (supabase_id, email) values ('__probe_a__', 'probe-a@example.com')`
  );
  await probeInsert(
    'insert WITH explicit id',
    `insert into public.users (id, supabase_id, email) values (gen_random_uuid()::text, '__probe_b__', 'probe-b@example.com')`
  );

  const leftovers = await prisma.$queryRawUnsafe(
    `select count(*)::int as n from public.users where supabase_id like '__probe%'`
  );
  console.log('leftover probe rows (must be 0):', JSON.stringify(leftovers));
} finally {
  await prisma.$disconnect();
}
