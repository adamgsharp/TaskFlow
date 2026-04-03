#!/usr/bin/env python3
import http.server
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
server = http.server.HTTPServer(('', 8080), http.server.SimpleHTTPRequestHandler)
server.serve_forever()
