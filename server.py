#!/usr/bin/env python3
import argparse
import http.server
import os
import threading
import webbrowser


def main():
    parser = argparse.ArgumentParser(description="Run Image Label Studio locally.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8765, type=int)
    parser.add_argument("--no-open", action="store_true", help="Do not open a browser automatically.")
    args = parser.parse_args()

    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)
    server = http.server.ThreadingHTTPServer((args.host, args.port), http.server.SimpleHTTPRequestHandler)
    url = f"http://{args.host}:{args.port}"

    if not args.no_open:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()

    print(f"Image Label Studio is running at {url}")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Image Label Studio.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
