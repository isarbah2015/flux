#!/usr/bin/env node
/**
 * Deploy Flux API to Render via REST API (Postgres + web service).
 * Usage: RENDER_API_KEY=rnd_… node scripts/deploy-render-api.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.render.com/v1';
const OWNER_ID = 'tea-d97qu6d8nd3s73e9nsfg';
const REPO = 'https://github.com/isarbah2015/flux';
const BRANCH = 'main';

const key = process.env.RENDER_API_KEY?.trim();
if (!key) {
  console.error('Set RENDER_API_KEY');
  process.exit(1);
}

function loadPaystack() {
  const envPath = resolve(ROOT, 'artifacts/api-server/.env');
  const text = readFileSync(envPath, 'utf8');
  const get = (name) => {
    const m = text.match(new RegExp(`^${name}=(.+)$`, 'm'));
    return m?.[1]?.trim() ?? '';
  };
  return {
    secret: get('PAYSTACK_SECRET_KEY'),
    public: get('PAYSTACK_PUBLIC_KEY'),
  };
}

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return json;
}

function unwrap(item) {
  return item?.postgres ?? item?.service ?? item;
}

async function findPostgres(name) {
  const list = await api('GET', `/postgres?ownerId=${OWNER_ID}&limit=50`);
  const items = Array.isArray(list) ? list : list?.items ?? [];
  for (const row of items) {
    const pg = unwrap(row);
    if (pg?.name === name) return pg;
  }
  return null;
}

async function findService(name) {
  const list = await api('GET', `/services?ownerId=${OWNER_ID}&limit=50`);
  const items = Array.isArray(list) ? list : list?.items ?? [];
  for (const row of items) {
    const svc = unwrap(row);
    if (svc?.name === name) return svc;
  }
  return null;
}

async function waitPostgresReady(id, maxMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const pg = unwrap(await api('GET', `/postgres/${id}`));
    const status = pg?.status ?? pg?.databaseStatus;
    console.log(`  postgres status: ${status ?? 'unknown'}`);
    if (status === 'available' || status === 'ready') return pg;
    await new Promise((r) => setTimeout(r, 15_000));
  }
  throw new Error('Postgres not ready in time');
}

async function getConnectionString(id) {
  const info = await api('GET', `/postgres/${id}/connection-info`);
  const conn = info?.connectionInfo ?? info;
  return conn?.externalConnectionString ?? conn?.connectionString ?? conn?.databaseUrl;
}

async function main() {
  const paystack = loadPaystack();
  console.log('Paystack keys:', paystack.secret ? `${paystack.secret.slice(0, 12)}…` : 'missing');

  let pg = await findPostgres('flux-db');
  if (!pg) {
    console.log('Creating Postgres flux-db…');
    const created = await api('POST', '/postgres', {
      name: 'flux-db',
      ownerId: OWNER_ID,
      plan: 'free',
      region: 'frankfurt',
      version: '16',
      databaseName: 'flux',
      databaseUser: 'flux',
    });
    pg = unwrap(created);
    console.log('  id:', pg.id);
  } else {
    console.log('Postgres flux-db exists:', pg.id);
  }

  await waitPostgresReady(pg.id);
  const databaseUrl = await getConnectionString(pg.id);
  if (!databaseUrl) throw new Error('No DATABASE_URL from Render');
  console.log('DATABASE_URL ready');

  const buildCommand =
    'corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/db run push && pnpm --filter @workspace/api-server run build';
  const startCommand = 'node --enable-source-maps artifacts/api-server/dist/index.mjs';

  const envVars = [
    { key: 'NODE_VERSION', value: '22' },
    { key: 'NODE_ENV', value: 'production' },
    { key: 'FLUX_ENV', value: 'testing' },
    { key: 'PORT', value: '8080' },
    { key: 'FIREBASE_PROJECT_ID', value: 'flux-screenshotos' },
    { key: 'PREMIUM_GRANT_EMAILS', value: 'isarbah2015@gmail.com' },
    { key: 'DATABASE_URL', value: databaseUrl },
  ];
  if (paystack.secret) envVars.push({ key: 'PAYSTACK_SECRET_KEY', value: paystack.secret });
  if (paystack.public) envVars.push({ key: 'PAYSTACK_PUBLIC_KEY', value: paystack.public });

  let svc = await findService('flux-api');
  if (!svc) {
    console.log('Creating web service flux-api…');
    const created = await api('POST', '/services', {
      type: 'web_service',
      name: 'flux-api',
      ownerId: OWNER_ID,
      repo: REPO,
      branch: BRANCH,
      autoDeploy: 'yes',
      envVars,
      serviceDetails: {
        runtime: 'node',
        plan: 'free',
        region: 'frankfurt',
        healthCheckPath: '/api/healthz',
        envSpecificDetails: {
          buildCommand,
          startCommand,
        },
      },
    });
    svc = unwrap(created?.service ?? created);
    console.log('  id:', svc.id);
    console.log('  url:', svc.serviceDetails?.url ?? svc.url ?? '(pending)');
  } else {
    console.log('flux-api exists:', svc.id);
    console.log('Trigger deploy…');
    await api('POST', `/services/${svc.id}/deploys`, { clearCache: 'clear' });
  }

  const url =
    svc.serviceDetails?.url ??
    svc.url ??
    `https://flux-api.onrender.com`;
  console.log('\nDone.');
  console.log('API URL:', url);
  console.log('Health:', `${url}/api/healthz`);
  console.log('Webhook:', `${url}/api/billing/webhook`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
