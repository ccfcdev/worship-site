#!/usr/bin/env python3
"""Local preview server that behaves like Vercel with cleanUrls: /about serves about.html, /about.html redirects
to /about, unknown paths get 404.html with a 404 status. usage: python3 tools-serve.py <port> <directory>"""
import http.server, os, sys, urllib.parse

PORT, ROOT = int(sys.argv[1]), os.path.abspath(sys.argv[2])


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_GET(self):
        u = urllib.parse.urlsplit(self.path)
        p = urllib.parse.unquote(u.path)
        if p.endswith('.html') and os.path.basename(p) != '404.html':
            clean = p[:-5]
            clean = clean[:-5] if clean.endswith('index') else clean
            self.send_response(308); self.send_header('Location', (clean or '/') + (('?' + u.query) if u.query else '')); self.end_headers(); return
        fs = os.path.join(ROOT, p.lstrip('/'))
        if os.path.isdir(fs) and os.path.exists(os.path.join(fs, 'index.html')):
            return super().do_GET()
        if not os.path.exists(fs) and os.path.exists(fs + '.html'):
            self.path = p + '.html' + (('?' + u.query) if u.query else '')
            return super().do_GET()
        if not os.path.exists(fs):
            body = open(os.path.join(ROOT, '404.html'), 'rb').read() if os.path.exists(os.path.join(ROOT, '404.html')) else b'Not found'
            self.send_response(404); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
        return super().do_GET()

    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer(('', PORT), Handler).serve_forever()
