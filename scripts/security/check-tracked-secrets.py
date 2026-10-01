#!/usr/bin/env python3
"""Reject sensitive file names in the index, printing paths only."""
import pathlib
import subprocess
import sys

def sensitive(path):
    name = pathlib.PurePosixPath(path).name.lower()
    return ((name.startswith('.env') and name != '.env.example')
            or name.startswith('.dev.vars')
            or name.endswith(('.pem', '.key', '.p12', '.pfx'))
            or name == 'credentials.json'
            or (name.startswith('service-account') and name.endswith('.json')))

if __name__ == '__main__':
    paths = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')
    found = [path for path in paths if path and sensitive(path)]
    if found:
        print('Sensitive files are tracked. Move credentials to provider secrets and untrack these paths:', file=sys.stderr)
        for path in found:
            print(path, file=sys.stderr)
        sys.exit(1)
