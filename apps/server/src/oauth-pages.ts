import { randomBytes } from "node:crypto";
import { Schema } from "effect";
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import type { Auth } from "./auth.ts";
import type { AccountAccess } from "./account-access.ts";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const scopeNames: Record<string, string> = {
  "polydays:read": "Читать задачи, расписание и историю полидней",
  "polydays:write": "Создавать, изменять и завершать задачи; менять расписание",
  offline_access: "Сохранять подключение между сеансами",
  openid: "Определять ваш аккаунт",
  profile: "Читать имя аккаунта",
  email: "Читать адрес почты",
};
const script = `const error=document.querySelector('[role=alert]');
async function send(path,body,button){
  const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);error.textContent='';
  const before=button.textContent;button.textContent='Подождите…';
  try{let res;try{res=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});}catch{throw new Error('Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.');}
    let data;try{data=await res.json();}catch{throw new Error('Не удалось прочитать ответ сервера. Попробуйте снова или начните подключение заново.');}
    if(!data||typeof data!=='object')throw new Error('Не удалось прочитать ответ сервера. Попробуйте снова или начните подключение заново.');
    if(!res.ok)throw new Error(data.error_description||data.message||data.error||'Не удалось выполнить действие. Попробуйте снова.');
    if(data.url)location.assign(data.url);else location.assign('/connect');
  }catch(e){error.textContent=e.message;buttons.forEach(b=>b.disabled=false);button.textContent=before;}
}
document.querySelectorAll('button[data-action]').forEach(button=>button.addEventListener('click',()=>{
 const query=document.querySelector('main').dataset.query;
 if(button.dataset.action==='login')send('/api/auth/sign-in/social',{provider:'google',callbackURL:location.origin+'/connect'+(query?'/login?'+query:''),...(query?{oauth_query:query}:{})},button);
 if(button.dataset.action==='consent')send('/api/auth/oauth2/consent',{accept:button.dataset.accept==='true',oauth_query:query},button);
 if(button.dataset.action==='revoke')send('/connect/revoke',{id:button.dataset.id},button);
}));`;

function page(title: string, body: string, query = "", status = 200) {
  const nonce = randomBytes(24).toString("base64");
  return new Response(
    `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Polydays</title>
<style nonce="${nonce}">
:root{color-scheme:light;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#252421;background:#faf9f6}*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px}main{width:100%;max-width:440px;background:#fff;border:1px solid #e9e7e2;border-radius:12px;padding:32px}header{display:flex;align-items:center;gap:12px;margin-bottom:28px;font-size:24px;font-weight:700}svg{color:#b9382e;flex:none}h1{font-size:22px;line-height:1.3;margin:0 0 12px}h2{font-size:16px;margin:0}p{margin:0 0 20px;color:#66645f}ul{padding-left:20px;margin:20px 0 24px}li+li{margin-top:10px}button,.button{display:block;width:100%;min-height:44px;padding:10px 16px;border:0;border-radius:6px;background:#b9382e;color:white;font-family:inherit;font-size:14px;font-weight:600;line-height:1.5;cursor:pointer;text-align:center;text-decoration:none}button:disabled{opacity:.65;cursor:wait}button.secondary{background:#fff;color:#252421;border:1px solid #e9e7e2;margin-top:10px}a{color:#b9382e;text-underline-offset:3px}a:focus-visible,button:focus-visible{outline:2px solid #b9382e;outline-offset:3px}::selection{background:#f9e9e4}small{font-size:13px;color:#66645f}code{display:block;overflow-wrap:anywhere;white-space:normal;font-size:13px;background:#faf9f6;padding:12px;border-radius:6px;margin:16px 0 24px}.connection{padding:20px 0;border-top:1px solid #e9e7e2}.connection p{font-size:13px;margin:8px 0 12px}[role=alert]:not(:empty){background:#fff0ed;color:#b9382e;padding:12px;border-radius:6px;margin-top:16px}footer{margin-top:24px;font-size:13px}@media(max-width:480px){main{padding:24px}body{padding:16px}}
</style></head><body><main data-query="${escape(query)}"><header><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 6-7 7-3-3M22 10l-7 7-3-3M2 12l5 5 3-3"/></svg>Polydays</header><h1>${escape(title)}</h1>${body}<div role="alert" aria-live="polite"></div><footer><a href="/current">Открыть Polydays</a></footer></main><script nonce="${nonce}">${script}</script></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
      },
    },
  );
}

export async function oauthPage(
  request: Request,
  auth: Auth,
  canAccess: AccountAccess,
  baseURL: string,
): Promise<Response> {
  const url = new URL(request.url);
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  if (user && !canAccess(user))
    return page(
      "Доступ запрещён",
      "<p>Для этого сервера нужен подтверждённый Google-аккаунт с разрешённым доступом.</p>",
      "",
      403,
    );
  if (request.method === "POST") {
    if (
      url.pathname !== "/connect/revoke" ||
      request.headers.get("origin") !== new URL(baseURL).origin
    )
      return Response.json({ error: "Недопустимый запрос." }, { status: 403 });
    if (!user) return Response.json({ error: "Войдите снова." }, { status: 401 });
    const { id } = Schema.decodeUnknownSync(Schema.Struct({ id: Schema.NonEmptyString }))(
      await request.json(),
    );
    const consents = await auth.api.getOAuthConsents({ headers: request.headers });
    const consent = consents.find((consent) => consent.id === id);
    if (!consent) return Response.json({ error: "Подключение не найдено." }, { status: 404 });
    // Remove consent first: the MCP boundary checks it on every call, including JWTs.
    await auth.api.deleteOAuthConsent({ headers: request.headers, body: { id } });
    const { adapter } = await auth.$context;
    for (const model of ["oauthAccessToken", "oauthRefreshToken"])
      await adapter.deleteMany({
        model,
        where: [
          { field: "userId", value: user.id },
          { field: "clientId", value: consent.clientId },
        ],
      });
    const codeSchema = Schema.Struct({
      type: Schema.Literal("authorization_code"),
      userId: Schema.String,
      query: Schema.Struct({ client_id: Schema.String }),
    });
    const codes: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const rows = await adapter.findMany<{ id: string; value: string }>({
        model: "verification",
        limit: 100,
        offset,
        sortBy: { field: "id", direction: "asc" },
      });
      for (const row of rows) {
        let value: unknown;
        try {
          value = JSON.parse(row.value);
        } catch {
          continue;
        }
        if (
          Schema.is(codeSchema)(value) &&
          value.userId === user.id &&
          value.query.client_id === consent.clientId
        )
          codes.push(row.id);
      }
      if (rows.length < 100) break;
    }
    for (const id of codes)
      await adapter.delete({ model: "verification", where: [{ field: "id", value: id }] });
    return Response.json({ ok: true });
  }
  if (request.method !== "GET")
    return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
  const query = url.search.slice(1);
  if (url.pathname === "/connect/consent" || url.pathname === "/connect/login") {
    const { secret } = await auth.$context;
    if (!(await verifyOAuthQueryParams(query, secret)))
      return page(
        "Ссылка подключения устарела",
        "<p>Начните подключение заново в вашем MCP-клиенте.</p>",
        "",
        400,
      );
    if (!user)
      return page(
        "Подключить к аккаунту",
        '<p>Войдите в Polydays, чтобы выбрать доступ для приложения.</p><button data-action="login">Продолжить с Google</button>',
        query,
      );
    if (url.pathname === "/connect/login")
      return Response.redirect(`${baseURL}/api/auth/oauth2/authorize?${query}`, 303);
    const clientId = url.searchParams.get("client_id");
    if (!clientId)
      return page("Некорректная ссылка", "<p>Начните подключение заново.</p>", "", 400);
    const client = await auth.api.getOAuthClientPublic({
      headers: request.headers,
      query: { client_id: clientId },
    });
    const scopes = (url.searchParams.get("scope") ?? "").split(" ").filter(Boolean);
    return page(
      "Разрешить доступ?",
      `<p><strong>${escape(client.client_name ?? clientId)}</strong> запрашивает доступ к вашему аккаунту.</p><ul>${scopes.map((scope) => `<li>${escape(scopeNames[scope] ?? scope)}</li>`).join("")}</ul><p><small>${escape(user.email)}</small></p><button data-action="consent" data-accept="true">Разрешить доступ</button><button class="secondary" data-action="consent" data-accept="false">Отклонить</button>`,
      query,
    );
  }
  if (!user)
    return page(
      "Подключения",
      '<p>Управляйте доступом ChatGPT и других приложений к вашим задачам.</p><button data-action="login">Продолжить с Google</button>',
    );
  const consents = await auth.api.getOAuthConsents({ headers: request.headers });
  const connections = await Promise.all(
    consents.map(async (consent) => {
      const client = await auth.api.getOAuthClientPublic({
        headers: request.headers,
        query: { client_id: consent.clientId },
      });
      return `<section class="connection"><h2>${escape(client.client_name ?? consent.clientId)}</h2><p>${consent.scopes.map((scope) => escape(scopeNames[scope] ?? scope)).join(" · ")}</p><button class="secondary" data-action="revoke" data-id="${escape(consent.id)}">Отозвать доступ</button></section>`;
    }),
  );
  return page(
    "Подключения",
    `<p>Добавьте этот адрес в MCP-клиенте:</p><code>${escape(baseURL)}/mcp</code>${connections.join("") || "<p>Подключений пока нет.</p>"}<p><small>${escape(user.email)}</small></p>`,
  );
}
