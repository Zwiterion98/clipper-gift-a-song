import {
  createSessionCookie,
  credentialsConfigured,
  isSameOrigin,
  passwordMatches,
} from "../lib/auth.js";
import { allowMethods, parseBody, sendJson } from "../lib/http.js";


export default async function handler(request, response) {
  if (request.method !== "POST") {
    allowMethods(response, ["POST"]);
    return sendJson(response, 405, { error: "Método no permitido." });
  }

  if (!isSameOrigin(request)) {
    return sendJson(response, 403, { error: "Origen no permitido." });
  }

  if (!credentialsConfigured()) {
    return sendJson(response, 503, { error: "La autenticación todavía no está configurada." });
  }

  try {
    const { password } = parseBody(request);
    if (!passwordMatches(password)) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      return sendJson(response, 401, { error: "Contraseña incorrecta." });
    }

    response.setHeader("Set-Cookie", createSessionCookie());
    return sendJson(response, 200, { authenticated: true });
  } catch {
    return sendJson(response, 400, { error: "Solicitud inválida." });
  }
}
