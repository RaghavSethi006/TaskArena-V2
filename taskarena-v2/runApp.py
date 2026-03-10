#!/usr/bin/env python3
"""Legacy launcher kept only to point existing workflows at the sidecar setup."""

from __future__ import annotations

import sys


def main() -> int:
    print(
        "runApp.py is retired.\n"
        "Use `cd frontend && npm run tauri dev` for the desktop app,\n"
        "or run `.\\dev.ps1` from taskarena-v2 for plain browser development.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
