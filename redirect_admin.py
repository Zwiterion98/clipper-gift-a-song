from __future__ import annotations

import json
import os
import subprocess
import threading
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "redirect-config.json"
ADMIN_PATH = "/_admin/"


def run_git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )


def validate_url(raw_value: object) -> str:
    if not isinstance(raw_value, str):
        raise ValueError("Ingresá una URL válida.")

    value = raw_value.strip()
    if not value.lower().startswith(("http://", "https://")):
        value = f"https://{value}"

    try:
        parsed = urlparse(value)
        hostname = parsed.hostname
        parsed.port
    except ValueError as error:
        raise ValueError("Ingresá una URL válida, por ejemplo: https://ejemplo.com") from error

    if parsed.scheme not in {"http", "https"} or not hostname:
        raise ValueError("Ingresá una URL válida, por ejemplo: https://ejemplo.com")

    return value


def read_config() -> dict[str, str]:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def write_config(url: str) -> None:
    temporary_path = CONFIG_PATH.with_suffix(".json.tmp")
    temporary_path.write_text(
        json.dumps({"url": url}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary_path, CONFIG_PATH)


def publish_config() -> bool:
    status = run_git("status", "--porcelain", "--", CONFIG_PATH.name).stdout.strip()
    if not status:
        return False

    run_git("add", "--", CONFIG_PATH.name)
    run_git("commit", "-m", "Actualizar destino de redirección", "--", CONFIG_PATH.name)
    run_git("push", "origin", "main")
    return True


class RedirectAdminHandler(SimpleHTTPRequestHandler):
    server_version = "ClipperRedirectAdmin/1.0"

    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, payload: dict[str, object], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] == "/api/redirect":
            try:
                self.send_json(read_config())
            except (OSError, json.JSONDecodeError) as error:
                self.send_json({"error": str(error)}, HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        super().do_GET()

    def do_POST(self) -> None:
        if self.path.split("?", 1)[0] != "/api/redirect":
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        if self.headers.get("X-Redirect-Admin") != "clipper-local":
            self.send_json({"error": "Solicitud no autorizada."}, HTTPStatus.FORBIDDEN)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > 4096:
                raise ValueError("Solicitud inválida.")

            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            destination = validate_url(payload.get("url"))
            write_config(destination)
            changed = publish_config()

            message = (
                "Destino publicado. GitHub Pages puede demorar alrededor de un minuto en actualizarse."
                if changed
                else "Ese destino ya estaba configurado; no fue necesario publicar cambios."
            )
            self.send_json({"url": destination, "message": message})
        except ValueError as error:
            self.send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
        except subprocess.CalledProcessError as error:
            detail = (error.stderr or error.stdout or "Error desconocido de Git.").strip()
            self.send_json(
                {"error": f"La URL se guardó localmente, pero no pudo publicarse: {detail}"},
                HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        except (OSError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error)}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def log_message(self, format: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {format % args}")


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 0), RedirectAdminHandler)
    address = f"http://127.0.0.1:{server.server_port}{ADMIN_PATH}"
    print("Configurador de redirección de CLIPPER")
    print(f"Abrí esta dirección si el navegador no se abre solo: {address}")
    print("Cerrá esta ventana cuando termines.")
    if os.environ.get("CLIPPER_ADMIN_NO_BROWSER") != "1":
        threading.Timer(0.4, webbrowser.open, args=(address,)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
