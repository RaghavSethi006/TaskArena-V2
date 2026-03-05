"""
Download the local Qwen GGUF model used by TaskArena.

Run from project root:
    python scripts/download_model.py

Optional:
    python scripts/download_model.py --url <hf-resolve-url> --force
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))

from shared.config import settings


DEFAULT_QWEN_URL = (
    "https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/"
    "Qwen2.5-7B-Instruct-Q4_K_M.gguf?download=true"
)


def download_file(url: str, output_path: Path, force: bool = False) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if output_path.exists() and not force:
        print(f"Model already exists at: {output_path}")
        print("Use --force to re-download.")
        return

    if output_path.exists() and force:
        output_path.unlink()

    temp_path = output_path.with_suffix(output_path.suffix + ".part")
    downloaded = temp_path.stat().st_size if temp_path.exists() else 0

    headers = {}
    mode = "ab"
    if downloaded > 0:
        headers["Range"] = f"bytes={downloaded}-"
    else:
        mode = "wb"

    timeout = httpx.Timeout(60.0, connect=30.0)
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        with client.stream("GET", url, headers=headers) as response:
            if response.status_code == 416:
                temp_path.rename(output_path)
                print(f"Model already fully downloaded: {output_path}")
                return
            response.raise_for_status()

            total = response.headers.get("Content-Length")
            total_bytes = int(total) + downloaded if total else None
            if downloaded and response.status_code != 206:
                downloaded = 0
                mode = "wb"

            print(f"Downloading model to: {output_path}")
            with open(temp_path, mode) as file_obj:
                written = downloaded
                for chunk in response.iter_bytes(chunk_size=1024 * 1024):
                    if not chunk:
                        continue
                    file_obj.write(chunk)
                    written += len(chunk)
                    if total_bytes:
                        pct = (written / total_bytes) * 100
                        print(f"\rProgress: {pct:6.2f}% ({written // (1024*1024)} MB)", end="", flush=True)
                    else:
                        print(f"\rDownloaded: {written // (1024*1024)} MB", end="", flush=True)

    temp_path.replace(output_path)
    print("\nDownload complete.")
    print(f"Saved model at: {output_path}")


def main() -> None:
    load_dotenv()

    parser = argparse.ArgumentParser(description="Download Qwen2.5 GGUF model for TaskArena.")
    parser.add_argument(
        "--url",
        default=DEFAULT_QWEN_URL,
        help="Model URL (Hugging Face resolve URL).",
    )
    parser.add_argument(
        "--output",
        default=settings.local_model_path,
        help="Output path for the GGUF file.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if model already exists.",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = settings.root / output_path

    try:
        download_file(url=args.url, output_path=output_path, force=args.force)
    except httpx.HTTPError as exc:
        print(f"\nHTTP error while downloading model: {exc}")
        raise SystemExit(1) from exc
    except OSError as exc:
        print(f"\nFile system error while saving model: {exc}")
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
