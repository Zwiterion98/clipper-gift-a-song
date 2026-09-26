export function sendJson(response, status, payload) {
  response.status(status);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.json(payload);
}


export function parseBody(request) {
  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  return request.body || {};
}


export function allowMethods(response, methods) {
  response.setHeader("Allow", methods.join(", "));
}
