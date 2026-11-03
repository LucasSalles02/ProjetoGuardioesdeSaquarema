import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx


def test_real_server_startup(db_url):
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    process = subprocess.Popen([sys.executable, "backend/run.py"], cwd=Path(__file__).resolve().parents[2],
                               env={**os.environ, "DATABASE_URL": db_url, "PORT": str(port), "HOST": "127.0.0.1", "PYTHONUTF8": "1"},
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            if process.poll() is not None:
                raise AssertionError("API encerrou antes do health check")
            try:
                response = httpx.get(f"http://127.0.0.1:{port}/api/health", timeout=.5)
                if response.status_code == 200:
                    assert response.json()["runtime"] == "python"
                    break
            except httpx.HTTPError:
                pass
            time.sleep(.1)
        else:
            raise AssertionError("API nao respondeu em tempo")
    finally:
        process.terminate()
        process.wait(timeout=10)
