import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.1";
import nodemailer from "npm:nodemailer@^9";

const PROD_ORIGIN = "https://bonoa.tramassso.com";
const LEGAL_VERSION = "2026-08-27";
const SMTP_HOST = Deno.env.get("BONOA_SMTP_HOST") || "authsmtp.securemail.pro";
const SMTP_PORT = Number(Deno.env.get("BONOA_SMTP_PORT") || "465");
const SMTP_FROM_NAME = Deno.env.get("BONOA_SMTP_FROM_NAME") || "Bonōa";

type SmtpError = Error & {
  code?: string;
  responseCode?: number;
  command?: string;
};

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
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function getAdminKey() {
  const modernKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modernKeys) {
    try {
      const parsed = JSON.parse(modernKeys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall back to legacy service role key.
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char] || char);
}

function confirmationEmail(name: string, actionLink: string) {
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(actionLink);
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f8fc;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #dbe7f5;border-radius:24px;padding:32px"><tr><td><div style="font-size:24px;font-weight:800;margin-bottom:24px">Bonōa</div><h1 style="font-size:24px;line-height:1.25;margin:0 0 16px">Confirma tu cuenta</h1><p style="font-size:15px;line-height:1.7;color:#475569">Hola ${safeName}. Confirma tu correo para activar tu wallet y tu QR personal.</p><p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">Confirmar mi cuenta</a></p><p style="font-size:12px;line-height:1.6;color:#64748b">Si el botón no funciona, copia y pega este enlace en tu navegador:</p><p style="font-size:12px;line-height:1.6;word-break:break-all;color:#2563eb">${safeLink}</p><p style="font-size:12px;line-height:1.6;color:#94a3b8;margin-top:28px">Si no has creado una cuenta en Bonōa, puedes ignorar este correo.</p></td></tr></table></td></tr></table></body></html>`;
}

function smtpFailureStatus(error: SmtpError) {
  if (error.code === "ETIMEDOUT") return 504;
  if (error.code === "EAUTH" || error.responseCode === 535 || error.responseCode === 534) return 502;
  if (typeof error.responseCode === "number" && error.responseCode >= 500) return 502;
  return 503;
}

async function sendConfirmationEmail(recipient: string, name: string, actionLink: string) {
  const username = Deno.env.get("BONOA_SMTP_USER")?.trim() || "";
  const password = Deno.env.get("BONOA_SMTP_PASSWORD") || "";
  if (!username || !password) throw new Error("SMTP credentials are not configured");
  if (!isValidEmail(username) || /[\r\n]/.test(username)) throw new Error("SMTP sender is invalid");
  if (!Number.isInteger(SMTP_PORT) || SMTP_PORT <= 0 || SMTP_PORT > 65535) throw new Error("SMTP port is invalid");

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: username, pass: password },
    authMethod: "LOGIN",
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: { servername: SMTP_HOST },
  });

  try {
    await transport.sendMail({
      from: { name: SMTP_FROM_NAME, address: username },
      to: recipient,
      subject: "Confirma tu cuenta de Bonōa",
      text: `Hola ${name}. Confirma tu cuenta de Bonōa abriendo este enlace: ${actionLink}`,
      html: confirmationEmail(name, actionLink),
      envelope: { from: username, to: recipient },
      headers: {
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "All",
      },
    });
  } finally {
    transport.close();
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
  } catch (rawError) {
    const smtpError = rawError as SmtpError;
    const cleanup = await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    if (cleanup.error) console.error("register-with-email cleanup failed", { status: cleanup.error.status, code: cleanup.error.code });
    console.error("register-with-email SMTP delivery failed", {
      code: smtpError.code || "unknown",
      responseCode: smtpError.responseCode || null,
      command: smtpError.command || null,
    });
    return json(origin!, { message: "No se ha podido enviar el correo de confirmación. Inténtalo de nuevo." }, smtpFailureStatus(smtpError));
  }

  return json(origin!, { ok: true, message: "Cuenta creada. Revisa tu correo para confirmar el acceso." });
});
