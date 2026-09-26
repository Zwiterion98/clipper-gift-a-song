import { isAuthenticated, isSameOrigin } from "../lib/auth.js";
import { readDestination, writeDestination } from "../lib/destination.js";
import { allowMethods, parseBody, sendJson } from "../lib/http.js";


function applyCors(request, response) {
  const allowedOrigin = process.env.PUBLIC_REDIRECT_ORIGIN || "https://zwiterion98.github.io";
  if (request.headers.origin === allowedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    response.setHeader("Vary", "Origin");
  }
}


export default async function handler(request, response) {
  applyCors(request, response);

  if (request.method === "OPTIONS") {
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return response.status(204).end();
  }

  if (request.method === "GET") {
    try {
      return sendJson(response, 200, await readDestination());
    } catch (error) {
      console.error("Failed to read redirect destination", error);
      return sendJson(response, 503, { error: "No se pudo cargar el destino." });
    }
  }

  if (request.method === "POST") {
    if (!isSameOrigin(request) || !isAuthenticated(request)) {
      return sendJson(response, 401, { error: "Sesión inválida o vencida." });
    }

    try {
      const { url } = parseBody(request);
      const destination = await writeDestination(url);
      return sendJson(response, 200, {
        ...destination,
        message: "Destino actualizado correctamente.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el destino.";
      const status = message.includes("almacenamiento") ? 503 : 400;
      return sendJson(response, status, { error: message });
    }
  }

  allowMethods(response, ["GET", "POST", "OPTIONS"]);
  return sendJson(response, 405, { error: "Método no permitido." });
}
