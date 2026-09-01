#!/usr/bin/env python3
"""
serve.py — سرور ایستای کوچک برای اجرای برنامه روی http://127.0.0.1:8081

معمولاً لازم نیست: برنامه هیچ fetch/XHR/ماژولی ندارد، پس با باز کردن
مستقیم index.html (فایل «run.cmd») هم کامل کار می‌کند. این سرور فقط
برای مرورگرهای سیاست‌محدود است که صفحات file:// را محدود می‌کنند.

هدرهای no-store می‌فرستد تا بعد از ویرایش فایل‌ها، نسخهٔ کهنه از کش
مرورگر سرو نشود.
"""
import functools
import http.server
import os
import sys

PORT = 8081
DIR = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.dirname(DIR)  # از tools/ به ریشهٔ پروژه

for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()

    def send_header(self, keyword, value):
        # Last-Modified/ETag را حذف می‌کنیم تا مرورگر 304 نزند
        if keyword in ("Last-Modified", "ETag"):
            return
        super().send_header(keyword, value)

    def log_message(self, fmt, *args):
        if "404" in (fmt % args):
            super().log_message(fmt, *args)


def main():
    os.chdir(DIR)
    handler = functools.partial(NoCacheHandler, directory=DIR)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    try:
        httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    except OSError as e:
        print("پورت %d آزاد نیست (%s). شاید نسخهٔ دیگری همین حالا در حال اجراست." % (PORT, e))
        input("برای بستن، Enter بزنید...")
        return 1
    print("در حال اجرا: http://127.0.0.1:%d/index.html" % PORT)
    print("برای توقف، این پنجره را ببندید یا Ctrl+C بزنید.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print()
        print("متوقف شد.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
