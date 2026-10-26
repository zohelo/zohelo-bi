// Makes the Cloudflare side of the portal exist and match this file (idempotent, run before
// every deploy): the Pages project with its runtime secrets, sign-in through Cloudflare Access
// (one-time PIN to the allowed emails) in front of every hostname, and bi.zohelo.com.
//
// Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, PORTAL_SIGNIN_ALLOWED_EMAILS (comma separated),
//      STORAGE_LAKEHOUSE_BUCKET_NAME, STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN.

const PROJECT = "zohelo-bi";
const DOMAIN = "bi.zohelo.com";
const ZONE = "zohelo.com";
const APP_NAME = "zohelo-bi";
const POLICY_NAME = "zohelo portal sign-in";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

const account = env("CLOUDFLARE_ACCOUNT_ID");
const token = env("CLOUDFLARE_API_TOKEN");

type Cf<T> = { success: boolean; result: T; errors?: { code: number; message: string }[] };

async function cf<T>(method: string, path: string, body?: unknown, allow404 = false): Promise<T | null> {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (allow404 && response.status === 404) return null;
  const json = (await response.json()) as Cf<T>;
  if (!json.success) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(json.errors)}`);
  return json.result;
}

function notice(title: string, message: string) {
  console.log(`::notice title=${title}::${message}`);
}

const a = `/accounts/${account}`;

// 1. Pages project and its runtime configuration (same for production and previews).
const runtime = {
  env_vars: {
    PLATFORM_ACCOUNT_ID: { type: "plain_text", value: account },
    STORAGE_LAKEHOUSE_BUCKET_NAME: { type: "plain_text", value: env("STORAGE_LAKEHOUSE_BUCKET_NAME") },
    STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN: { type: "secret_text", value: env("STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN") },
  },
  compatibility_date: "2026-10-01",
};
const project = await cf<{ name: string; subdomain: string }>("GET", `${a}/pages/projects/${PROJECT}`, undefined, true);
if (!project) {
  await cf("POST", `${a}/pages/projects`, { name: PROJECT, production_branch: "main" });
  notice("pages project", `created ${PROJECT}`);
}
await cf("PATCH", `${a}/pages/projects/${PROJECT}`, { deployment_configs: { production: runtime, preview: runtime } });
notice("pages project", `${PROJECT}: runtime configuration set`);

// 2. Access: one-time PIN sign-in, one reusable policy, one app over every hostname of the project.
const idps = (await cf<{ id: string; type: string }[]>("GET", `${a}/access/identity_providers`)) ?? [];
let otp = idps.find((i) => i.type === "onetimepin");
if (!otp) {
  otp = (await cf<{ id: string; type: string }>("POST", `${a}/access/identity_providers`, { name: "One-time PIN", type: "onetimepin", config: {} }))!;
  notice("access", "one-time PIN sign-in added");
}

const emails = env("PORTAL_SIGNIN_ALLOWED_EMAILS")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const policyBody = { name: POLICY_NAME, decision: "allow", include: emails.map((email) => ({ email: { email } })), session_duration: "24h" };
const policies = (await cf<{ id: string; name: string }[]>("GET", `${a}/access/policies`)) ?? [];
let policy = policies.find((p) => p.name === POLICY_NAME);
policy = policy
  ? (await cf<{ id: string; name: string }>("PUT", `${a}/access/policies/${policy.id}`, policyBody))!
  : (await cf<{ id: string; name: string }>("POST", `${a}/access/policies`, policyBody))!;

const hostnames = [DOMAIN, `${PROJECT}.pages.dev`, `*.${PROJECT}.pages.dev`];
const appBody = {
  name: APP_NAME,
  type: "self_hosted",
  domain: DOMAIN,
  destinations: hostnames.map((uri) => ({ type: "public", uri })),
  session_duration: "24h",
  allowed_idps: [otp.id],
  auto_redirect_to_identity: true,
  app_launcher_visible: false,
  policies: [{ id: policy.id, precedence: 1 }],
};
const apps = (await cf<{ id: string; name: string }[]>("GET", `${a}/access/apps`)) ?? [];
const app = apps.find((x) => x.name === APP_NAME);
if (app) await cf("PUT", `${a}/access/apps/${app.id}`, appBody);
else await cf("POST", `${a}/access/apps`, appBody);
notice("access", `${APP_NAME} protects ${hostnames.join(", ")} for ${emails.length} email(s)`);

// 3. Custom domain: attach to the project and point DNS at it.
const domains = (await cf<{ name: string; status: string }[]>("GET", `${a}/pages/projects/${PROJECT}/domains`)) ?? [];
if (!domains.some((d) => d.name === DOMAIN)) {
  await cf("POST", `${a}/pages/projects/${PROJECT}/domains`, { name: DOMAIN });
  notice("domain", `${DOMAIN} attached to ${PROJECT}`);
}
const zones = (await cf<{ id: string }[]>("GET", `/zones?name=${ZONE}`)) ?? [];
const zone = zones[0]?.id;
if (!zone) throw new Error(`zone ${ZONE} not visible to the token`);
const records = (await cf<{ id: string; type: string; content: string }[]>("GET", `/zones/${zone}/dns_records?name=${DOMAIN}`)) ?? [];
const target = `${PROJECT}.pages.dev`;
const cname = records.find((r) => r.type === "CNAME");
if (!cname) {
  if (records.length) throw new Error(`${DOMAIN} has other DNS records (${records.map((r) => r.type).join(", ")}); not touching them`);
  await cf("POST", `/zones/${zone}/dns_records`, { type: "CNAME", name: DOMAIN, content: target, proxied: true, comment: "zohelo-bi portal (Pages)" });
  notice("dns", `${DOMAIN} CNAME ${target} created`);
} else if (cname.content !== target) {
  await cf("PATCH", `/zones/${zone}/dns_records/${(cname as { id: string }).id}`, { content: target, proxied: true });
  notice("dns", `${DOMAIN} CNAME repointed to ${target}`);
}
const status = ((await cf<{ name: string; status: string }[]>("GET", `${a}/pages/projects/${PROJECT}/domains`)) ?? []).find((d) => d.name === DOMAIN)?.status;
notice("domain", `${DOMAIN}: ${status ?? "unknown"}`);
