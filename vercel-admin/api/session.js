import { isAuthenticated } from "../lib/auth.js";
import { allowMethods, sendJson } from "../lib/http.js";


export default async function handler(request, response) {
  if (request.method !== "GET") {
    allowMethods(response, ["GET"]);
    return sendJson(response, 405, { error: "Método no permitido." });
  }

  return sendJson(response, 200, {
    authenticated: isAuthenticated(request),
  });
}
