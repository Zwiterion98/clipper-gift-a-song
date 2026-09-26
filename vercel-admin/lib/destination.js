import { get, list, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";


const CONFIG_PREFIX = "redirect-config/";
const FALLBACK_URL = "https://linktr.ee/clipper.jta?utm_source=qr_code";


export function getDefaultDestination() {
  return validateDestination(process.env.DEFAULT_REDIRECT_URL || FALLBACK_URL);
}


export function validateDestination(rawValue) {
  if (typeof rawValue !== "string") {
    throw new Error("Ingresá una URL válida.");
  }

  const trimmedValue = rawValue.trim();
  const normalizedValue = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
  const destination = new URL(normalizedValue);

  if (!["http:", "https:"].includes(destination.protocol) || !destination.hostname) {
    throw new Error("Ingresá una URL válida, por ejemplo: https://ejemplo.com");
  }

  return destination.href;
}


export async function readDestination() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { url: getDefaultDestination(), configured: false };
  }

  const { blobs } = await list({ prefix: CONFIG_PREFIX, limit: 1000 });
  if (!blobs.length) {
    return { url: getDefaultDestination(), configured: false };
  }

  const latestBlob = [...blobs].sort((left, right) =>
    right.pathname.localeCompare(left.pathname),
  )[0];
  const result = await get(latestBlob.url, { access: "private" });

  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("No se pudo leer la configuración guardada.");
  }

  const config = await new Response(result.stream).json();
  return {
    url: validateDestination(config.url),
    configured: true,
    updatedAt: config.updatedAt || null,
  };
}


export async function writeDestination(rawValue) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("El almacenamiento privado de Vercel todavía no está conectado.");
  }

  const url = validateDestination(rawValue);
  const updatedAt = new Date().toISOString();
  const sortableTimestamp = updatedAt.replace(/[-:.TZ]/g, "");
  const pathname = `${CONFIG_PREFIX}${sortableTimestamp}-${randomUUID()}.json`;
  const body = JSON.stringify({ url, updatedAt });

  await put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });

  return { url, configured: true, updatedAt };
}
