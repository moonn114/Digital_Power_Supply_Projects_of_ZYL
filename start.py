"""
Digital Power Lab 博客 — 本地开发服务器
启动后访问 http://localhost:8080
"""
import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

PORT = 8080
DIR = Path(__file__).parent

os.chdir(DIR)


class MyHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"  📄 {args[0]}")

    def end_headers(self):
        # 禁用缓存，方便开发
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()


if __name__ == '__main__':
    print(f"""
╔══════════════════════════════════════╗
║   ⚡ Digital Power Lab Blog        ║
║   数字电源项目博客                   ║
╠══════════════════════════════════════╣
║   本地地址: http://localhost:{PORT}    ║
║   按 Ctrl+C 停止服务器              ║
╚══════════════════════════════════════╝
""")
    with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 服务器已停止")
