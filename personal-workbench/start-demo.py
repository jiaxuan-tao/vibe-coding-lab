#!/usr/bin/env python3
"""Serve the bundled workbench locally without external dependencies."""

import argparse
import errno
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser


def main():
    parser = argparse.ArgumentParser(description="个人工作台本地演示")
    parser.add_argument("--port", type=int, default=5196)
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error("端口需要在 0–65535 之间")
    root = Path(__file__).resolve().parent
    directory = root / "dist" if (root / "dist" / "index.html").is_file() else root
    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError as error:
        if error.errno != errno.EADDRINUSE:
            raise
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        print("默认端口已占用，改用临时端口；浏览器会使用独立的本地存储。", flush=True)
    url = "http://127.0.0.1:%s/?demo=1#/dashboard" % server.server_port
    print("个人工作台：" + url, flush=True)
    print("关闭此窗口或按 Ctrl+C 停止。", flush=True)
    if not args.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
