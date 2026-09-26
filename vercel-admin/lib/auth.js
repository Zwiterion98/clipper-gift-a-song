import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";


const COOKIE_NAME = "__Host-clipper_admin";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;


function sha256(value) {
  return createHash("sha256").update(value).digest();
}


function constantTimeEqual(left, right) {
  return timingSafeEqual(sha256(left), sha256(right));
}


function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separator = item.indexOf("=");
        return separator === -1
          ? [item, ""]
          : [item.slice(0, separator), decodeURIComponent(item.slice(separator + 1))];
      }),
  );
}


function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}


function getSessionSecret() {
  const secret = process.env.SESSION_SECRET || "";
  return secret.length >= 32 ? secret : null;
}


export function credentialsConfigured() {
  return Boolean(
    process.env.ADMIN_PASSWORD?.length >= 16 && getSessionSecret(),
  );
}


export function passwordMatches(candidate) {
  const expected = process.env.ADMIN_PASSWORD || "";
  return credentialsConfigured() && constantTimeEqual(String(candidate || ""), expected);
}


export function createSessionCookie() {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS }),
  ).toString("base64url");
  const token = `${payload}.${sign(payload, secret)}`;

  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}`;
}


export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}


export function isAuthenticated(request) {
  const secret = getSessionSecret();
  if (!secret) {
    return false;
  }

  const token = parseCookies(request.headers.cookie)[COOKIE_NAME];
  if (!token) {
    return false;
  }

  const separator = token.lastIndexOf(".");
  if (separator === -1) {
    return false;
  }

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!constantTimeEqual(signature, sign(payload, secret))) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(session.exp) && session.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}


export function isSameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers["x-forwarded-host"] || request.headers.host;

  if (!origin || !host) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
