from __future__ import annotations

import json
import os
import sys
import threading
import time
import webbrowser
from pathlib import Path


def _get_install_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent


def _setup_env() -> None:
    install_dir = _get_install_dir()

    # FEDSTOCK_DATA_DIR: 모델/outputs 경로 (앱이 읽고 쓰는 데이터 루트)
    os.environ.setdefault("FEDSTOCK_DATA_DIR", str(install_dir))

    # fedstock.config.json에서 Flower 서버 주소 읽기
    if "FLOWER_SERVER" not in os.environ:
        config_path = install_dir / "fedstock.config.json"
        if config_path.exists():
            try:
                config = json.loads(config_path.read_text(encoding="utf-8"))
                server = config.get("flower_server", "").strip()
                if server:
                    os.environ["FLOWER_SERVER"] = server
            except Exception:
                pass


def _open_browser() -> None:
    time.sleep(2.5)
    webbrowser.open("http://127.0.0.1:8000")


if __name__ == "__main__":
    _setup_env()

    import uvicorn

    threading.Thread(target=_open_browser, daemon=True).start()
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="warning")
