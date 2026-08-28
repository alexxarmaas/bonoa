import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.1";

const PROD_ORIGIN = "https://bonoa.tramassso.com";
const LEGAL_VERSION = "2026-08-27";
const SMTP_HOST = Deno.env.get("BONOA_SMTP_HOST") || "authsmtp.securemail.pro";
const SMTP_PORT = Number(Deno.env.get("BONOA_SMTP_PORT") || "465");
const SMTP_FROM_NAME = Deno.env.get("BONOA_SMTP_FROM_NAME") || "Bonōa";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  if (origin === PROD_ORIGIN || origin === "https://bonoa.vercel.app" || origin === "http://localhost:3000") return true;
  return /^https:\/\/bonoa-[a-z0-9-]+-alexxarmaas-projects\.vercel\.app$/i.test(origin);
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(origin: string, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function getAdminKey() {
  const modernKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modernKeys) {
    try {
      const parsed = JSON.parse(modernKeys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall back to the legacy service-role key below.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function safeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/wallet";
  return value.slice(0, 500);
}

function isValidEmail(value: string) {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function base64Utf8(value: string) {
  const bytes = encoder.encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") || "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

async function writeAll(conn: Deno.Conn, value: string) {
  const bytes = encoder.encode(value);
  let offset = 0;
  while (offset < bytes.length) {
    offset += await withTimeout(conn.write(bytes.subarray(offset)), 15_000, "SMTP write timeout");
  }
}

async function readSmtpResponse(conn: Deno.Conn) {
  let text = "";
  const chunk = new Uint8Array(4096);
  while (true) {
    const count = await withTimeout(conn.read(chunk), 20_000, "SMTP response timeout");
    if (count === null) throw new Error("SMTP connection closed unexpectedly");
    text += decoder.decode(chunk.subarray(0, count), { stream: true });
    const lines = text.split("\r\n").filter(Boolean);
    const first = lines[0]?.match(/^(\d{3})([ -])/);
    if (!first) continue;
    const code = Number(first[1]);
    if (first[2] === " " || lines.some((line) => line.startsWith(`${first[1]} `))) {
      return { code, text: lines.join(" | ") };
    }
  }
}

async function expect(conn: Deno.Conn, command: string | null, accepted: number[]) {
  if (command !== null) await writeAll(conn, `${command}\r\n`);
  const response = await readSmtpResponse(conn);
  if (!accepted.includes(response.code)) throw new Error(`SMTP rejected command (${response.code})`);
  return response;
}

function confirmationEmail(name: string, actionLink: string) {
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(actionLink);
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f8fc;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #dbe7f5;border-radius:24px;padding:32px"><tr><td><div style="font-size:24px;font-weight:800;margin-bottom:24px">Bonōa</div><h1 style="font-size:24px;line-height:1.25;margin:0 0 16px">Confirma tu cuenta</h1><p style="font-size:15px;line-height:1.7;color:#475569">Hola ${safeName}. Confirma tu correo para activar tu wallet y tu QR personal.</p><p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">Confirmar mi cuenta</a></p><p style="font-size:12px;line-height:1.6;color:#64748b">Si el botón no funciona, copia y pega este enlace en tu navegador:</p><p style="font-size:12px;line-height:1.6;word-break:break-all;color:#2563eb">${safeLink}</p><p style="font-size:12px;line-height:1.6;color:#94a3b8;margin-top:28px">Si no has creado una cuenta en Bonōa, puedes ignorar este correo.</p></td></tr></table></td></tr></table></body></html>`;
}

async function sendConfirmationEmail(recipient: string, name: string, actionLink: string) {
  const username = Deno.env.get("BONOA_SMTP_USER")?.trim() || "";
  const password = Deno.env.get("BONOA_SMTP_PASSWORD") || "";
  if (!username || !password) throw new Error("SMTP credentials are not configured");
  if (!isValidEmail(username) || /[\r\n]/.test(username)) throw new Error("SMTP sender is invalid");
  if (!Number.isInteger(SMTP_PORT) || SMTP_PORT <= 0 || SMTP_PORT > 65535) throw new Error("SMTP port is invalid");

  const conn = await withTimeout(Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT }), 20_000, "SMTP connection timeout");
  try {
    await expect(conn, null, [220]);
    await expect(conn, "EHLO bonoa.tramassso.com", [250]);
    await expect(conn, "AUTH LOGIN", [334]);
    await expect(conn, btoa(username), [334]);
    await expect(conn, btoa(password), [235]);
    await expect(conn, `MAIL FROM:<${username}>`, [250]);
    await expect(conn, `RCPT TO:<${recipient}>`, [250, 251]);
    await expect(conn, "DATA", [354]);

    const subject = `=?UTF-8?B?${base64Utf8("Confirma tu cuenta de Bonōa")}?=`;
    const fromName = `=?UTF-8?B?${base64Utf8(SMTP_FROM_NAME)}?=`;
    const html = confirmationEmail(name, actionLink);
    const message = [
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@tramassso.com>`,
      `From: ${fromName} <${username}>`,
      `To: <${recipient}>`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "Auto-Submitted: auto-generated",
      "X-Auto-Response-Suppress: All",
      "",
      wrapBase64(base64Utf8(html)),
      "",
    ].join("\r\n");

    await writeAll(conn, `${message}.\r\n`);
    await expect(conn, null, [250]);

    try {
      await expect(conn, "QUIT", [221]);
    } catch {
      // Once DATA returns 250 the message was accepted; QUIT is best-effort.
    }
  } finally {
    try { conn.close(); } catch { /* already closed */ }
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) return new Response("Forbidden", { status: 403 });
  const headers = corsHeaders(origin!);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json(origin!, { message: "Método no permitido." }, 405);

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 16_384) return json(origin!, { message: "Solicitud demasiado grande." }, 413);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(origin!, { message: "Solicitud inválida." }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const next = safeNextPath(body.next);

  if (name.length < 2 || name.length > 80) return json(origin!, { message: "El nombre debe tener entre 2 y 80 caracteres." }, 400);
  if (!isValidEmail(email)) return json(origin!, { message: "Introduce un correo electrónico válido." }, 400);
  if (password.length < 8 || password.length > 128) return json(origin!, { message: "La contraseña debe tener entre 8 y 128 caracteres." }, 400);

  const adminKey = getAdminKey();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  if (!adminKey || !supabaseUrl || !Deno.env.get("BONOA_SMTP_USER") || !Deno.env.get("BONOA_SMTP_PASSWORD")) {
    console.error("register-with-email is missing required server configuration");
    return json(origin!, { message: "El registro no está disponible temporalmente." }, 503);
  }

  const supabaseAdmin = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const loginDestination = next === "/wallet" ? "/login?confirmed=1" : `/login?confirmed=1&next=${encodeURIComponent(next)}`;
  const redirectTo = `${PROD_ORIGIN}${loginDestination}`;
  const acceptedAt = new Date().toISOString();

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    data: {
      display_name: name,
      legal_terms_version: LEGAL_VERSION,
      legal_terms_accepted_at: acceptedAt,
      privacy_notice_version: LEGAL_VERSION,
      privacy_notice_acknowledged_at: acceptedAt,
    },
    redirectTo,
  });

  if (error || !data.user?.id || !data.properties?.action_link) {
    console.warn("register-with-email generateLink failed", { status: error?.status, code: error?.code });
    return json(origin!, { message: "No hemos podido crear la cuenta. Si ya te registraste, inicia sesión o recupera tu contraseña." }, error?.status === 422 ? 409 : 400);
  }

  try {
    await sendConfirmationEmail(email, name, data.properties.action_link);
  } catch (smtpError) {
    const cleanup = await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    if (cleanup.error) console.error("register-with-email cleanup failed", { status: cleanup.error.status, code: cleanup.error.code });
    console.error("register-with-email SMTP delivery failed", { message: smtpError instanceof Error ? smtpError.message : "unknown SMTP error" });
    return json(origin!, { message: "No se ha podido enviar el correo de confirmación. Inténtalo de nuevo." }, 503);
  }

  return json(origin!, { ok: true, message: "Cuenta creada. Revisa tu correo para confirmar el acceso." });
});
