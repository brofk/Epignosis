"""Reject generated output and local data in the Git index."""

import os
from pathlib import PurePosixPath
import subprocess
import sys


GENERATED_DIRECTORIES = frozenset({
    "node_modules", ".next", ".vinext", ".wrangler", ".vercel",
    ".sites-runtime", "__pycache__",
})
WEBSITE_OUTPUT_DIRECTORIES = frozenset({
    "dist", "out", "coverage", "test-results", "playwright-report",
    "outputs", "work",
})
LOCAL_FILE_SUFFIXES = (
    ".db", ".db-shm", ".db-wal", ".sqlite", ".sqlite-shm", ".sqlite-wal",
    ".sqlite3", ".sqlite3-shm", ".sqlite3-wal", ".tsbuildinfo", ".pyc",
)


def is_generated_artifact(path):
    parts = PurePosixPath(path.casefold()).parts
    return (
        any(part in GENERATED_DIRECTORIES for part in parts)
        or (len(parts) >= 2 and parts[0] == "wpmn-ecf-website"
            and parts[1] in WEBSITE_OUTPUT_DIRECTORIES)
        or parts[-1].endswith(LOCAL_FILE_SUFFIXES)
    )


def main():
    tracked = subprocess.check_output(["git", "ls-files", "--cached", "-z"])
    violations = [
        path for entry in tracked.split(b"\0") if entry
        for path in [os.fsdecode(entry)] if is_generated_artifact(path)
    ]
    if violations:
        print("Artifact policy failed. Remove these paths from Git tracking:", file=sys.stderr)
        for path in violations:
            print(f"  {path!r}", file=sys.stderr)
        return 1

    print("Artifact policy passed. No generated output or local database paths are tracked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
