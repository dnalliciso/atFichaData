#!/usr/bin/env python3
"""Servidor local para desarrollo, igual que `python3 -m http.server`
pero mandando headers de "no cachear nada" en cada respuesta.

Por qué hace falta: `python3 -m http.server` no manda ningún header de
caché, así que queda a criterio del navegador — y Chrome suele cachear
agresivamente los módulos JS/CSS servidos así, mostrando una versión
vieja del código aunque el archivo en disco ya haya cambiado (justo el
problema que nos venía pasando al iterar sobre el heatmap).

Uso: igual que el server normal.

    python3 serve.py [puerto]   # por defecto 8080
"""

import http.server
import sys


class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    http.server.test(HandlerClass=NoCacheHTTPRequestHandler, port=port)
