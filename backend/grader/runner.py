import subprocess
import sys
import os
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 2:
        print("Missing submission path", file=sys.stderr)
        return 2

    submission_path = Path(sys.argv[1])
    if not submission_path.exists():
        print(f"Submission not found: {submission_path}", file=sys.stderr)
        return 2

    timeout_ms = int(os.environ.get("PYTHON_EXEC_TIMEOUT_MS", "5000"))
    timeout_seconds = max(timeout_ms / 1000.0, 0.1)

    try:
        completed = subprocess.run(
            [sys.executable, str(submission_path)],
            input=sys.stdin.read(),
            text=True,
            capture_output=True,
            timeout=timeout_seconds,
        )
        sys.stdout.write(completed.stdout)
        sys.stderr.write(completed.stderr)
        return completed.returncode
    except subprocess.TimeoutExpired:
        print("Execution timeout (code took too long to execute)", file=sys.stderr)
        return 124


if __name__ == "__main__":
    raise SystemExit(main())
