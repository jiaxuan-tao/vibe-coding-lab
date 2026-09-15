#!/usr/bin/env python3
"""Test-only entry point that selects an existing browser without user state writes."""
import os
import sys
from pathlib import Path


project = Path(os.environ["PROTOTYPE_PROJECT_DIR"]).resolve()
sys.path.insert(0, str(project / "scripts"))
import prototype_server  # noqa: E402


channel = os.environ.get("PM_TEST_BROWSER_CHANNEL") or "chrome"
prototype_server.launch_engine = lambda: channel
prototype_server.main()
