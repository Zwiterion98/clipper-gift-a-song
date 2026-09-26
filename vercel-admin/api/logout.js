import { clearSessionCookie, isSameOrigin } from "../lib/auth.js";
import { allowMethods, sendJson } from "../lib/http.js";


export default async function handler(request, response) {
  if (request.method !== "POST") {
    allowMethods(response, ["POST"]);
    return sendJson(response, 405, { error: "Método no permitido." });
  }

  if (!isSameOrigin(request)) {
    return sendJson(response, 403, { error: "Origen no permitido." });
  }

  response.setHeader("Set-Cookie", clearSessionCookie());
  return sendJson(response, 200, { authenticated: false });
}
