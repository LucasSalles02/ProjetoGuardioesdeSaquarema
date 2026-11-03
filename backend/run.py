import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "python"))

from gds.app import create_app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(create_app(), host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "3333")),
                proxy_headers=False, log_level="info")
