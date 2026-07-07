#!/usr/bin/env node
/**
 * Enable Google Sign-In on flux-screenshotos and write OAuth client IDs to mobile .env.
 * Requires: firebase login (firebase-tools credentials on this machine).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'flux-screenshotos';
const PROJECT_NUMBER = '629513991075';
const ENV_FILE = path.resolve(
  process.argv[2] ?? 'artifacts/mobile/.env',
);
const FIREBASE_CFG = path.join(
  os.homedir(),
  '.config/configstore/firebase-tools.json',
);

function loadAccessToken() {
  const raw = JSON.parse(fs.readFileSync(FIREBASE_CFG, 'utf8'));
  const token = raw.tokens?.access_token;
  if (!token) {
    throw new Error('No Firebase access token. Run: firebase login --reauth');
  }
  return token;
}

async function api(token, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function upsertEnv(key, value) {
  if (!value) return;
  let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  content = re.test(content) ? content.replace(re, line) : `${content.replace(/\n?$/, '\n')}${line}\n`;
  fs.writeFileSync(ENV_FILE, content);
}

async function listOAuthClients(token) {
  const { res, body } = await api(
    token,
    `https://iap.googleapis.com/v1/projects/${PROJECT_NUMBER}/brands`,
  );
  if (!res.ok) return [];
  const brands = body.brands ?? [];
  const clients = [];
  for (const brand of brands) {
    const list = await api(token, `https://iap.googleapis.com/v1/${brand.name}/identityAwareProxyClients`);
    if (list.res.ok) {
      for (const c of list.body.identityAwareProxyClients ?? []) {
        clients.push(c);
      }
    }
  }
  return clients;
}

async function ensureGoogleIdp(token, webClientId, clientSecret = '') {
  const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/defaultSupportedIdpConfigs`;
  const get = await api(token, `${base}/google.com`);
  if (get.res.ok) {
    if (get.body.enabled) return get.body;
    const patch = await api(token, `${base}/google.com?updateMask=enabled`, {
      method: 'PATCH',
      body: JSON.stringify({ name: `projects/${PROJECT_ID}/defaultSupportedIdpConfigs/google.com`, enabled: true }),
    });
    if (!patch.res.ok) throw new Error(JSON.stringify(patch.body));
    return patch.body;
  }

  const create = await api(token, `${base}?idpId=google.com`, {
    method: 'POST',
    body: JSON.stringify({
      name: `projects/${PROJECT_ID}/defaultSupportedIdpConfigs/google.com`,
      enabled: true,
      clientId: webClientId,
      clientSecret,
    }),
  });
  if (!create.res.ok) throw new Error(JSON.stringify(create.body));
  return create.body;
}

async function fetchSdkOAuthIds() {
  const { execSync } = await import('node:child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flux-sdk-'));
  const androidApp = '1:629513991075:android:a5fab6b6763bdf2e432016';
  const iosApp = '1:629513991075:ios:46218ad3f0c73e31432016';
  execSync(
    `firebase apps:sdkconfig ANDROID ${androidApp} --project ${PROJECT_ID} -o "${tmp}/google-services.json"`,
    { stdio: 'pipe' },
  );
  execSync(
    `firebase apps:sdkconfig IOS ${iosApp} --project ${PROJECT_ID} -o "${tmp}/GoogleService-Info.plist"`,
    { stdio: 'pipe' },
  );

  const android = JSON.parse(fs.readFileSync(`${tmp}/google-services.json`, 'utf8'));
  const clients = android.client?.[0]?.oauth_client ?? [];
  const web = clients.find((c) => c.client_type === 3)?.client_id ?? '';
  const androidId = clients.find((c) => c.client_type === 1)?.client_id ?? '';

  let ios = '';
  const plist = fs.readFileSync(`${tmp}/GoogleService-Info.plist`, 'utf8');
  const iosMatch = plist.match(/<key>CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/);
  if (iosMatch) ios = iosMatch[1];

  fs.rmSync(tmp, { recursive: true, force: true });
  return { web, androidId, ios };
}

async function main() {
  const token = loadAccessToken();
  console.log(`Project: ${PROJECT_ID}`);

  let { web, androidId, ios } = await fetchSdkOAuthIds();
  console.log('SDK oauth clients:', { web, androidId, ios });

  if (!web) {
    console.log('\nNo Web OAuth client yet. Open Firebase Console and enable Google Sign-In:');
    console.log(`  https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers`);
    console.log('Click Google → Enable → Save. Then re-run this script.\n');
    process.exit(1);
  }

  console.log('Enabling Google identity provider…');
  await ensureGoogleIdp(token, web);

  ({ web, androidId, ios } = await fetchSdkOAuthIds());

  upsertEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', web);
  upsertEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', ios);
  upsertEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', androidId);

  console.log(`\nUpdated ${ENV_FILE}:`);
  console.log(`  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=${web}`);
  console.log(`  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=${ios || '(pending — re-download after enable)'}`);
  console.log(`  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=${androidId || '(pending)'}`);
  console.log('\nRestart Expo: cd artifacts/mobile && pnpm run dev:local -- --clear');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
