"""Collect only trusted reviewer runs. gh handles authenticated artifact redirects."""
import datetime
import json
import os
import pathlib
import re
import subprocess
from urllib.parse import urlencode

repo = os.environ['GITHUB_REPOSITORY']
if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo):
    raise ValueError('Invalid repository')

def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], text=True))

root = pathlib.Path('telemetry')
root.mkdir(exist_ok=True)
count = 0
now = datetime.datetime.now(datetime.timezone.utc)
seen = set()
# Scope pagination to this workflow and one UTC day at a time. Unrelated repository
# artifacts do not consume the collection budget; never rely on artifact ordering.
for offset in range(16):
    day = (now - datetime.timedelta(days=offset)).date().isoformat()
    page = 1
    while True:
        query = urlencode({'event': 'pull_request_target', 'created': day, 'per_page': 100, 'page': page})
        result = api(f'repos/{repo}/actions/workflows/ai-production-review.yml/runs?{query}')
        if result['total_count'] > 1000:
            raise RuntimeError(f'More than 1000 reviewer runs on {day}; GitHub filtered-search limit prevents complete reporting')
        runs = result['workflow_runs']
        for run in runs:
            if run['id'] in seen:
                continue
            seen.add(run['id'])
            if run['event'] != 'pull_request_target' or run['path'] != '.github/workflows/ai-production-review.yml':
                raise ValueError('Unexpected workflow identity')
            artifact_page = 1
            while True:
                artifacts = api(f"repos/{repo}/actions/runs/{run['id']}/artifacts?per_page=100&page={artifact_page}")['artifacts']
                for artifact in artifacts:
                    if not re.fullmatch(r'ai-usage-\d+-\d+', artifact['name']) or artifact['expired']:
                        continue
                    destination = root / str(artifact['id'])
                    destination.mkdir(exist_ok=True)
                    subprocess.run(['gh', 'run', 'download', str(run['id']), '--repo', repo,
                                    '--name', artifact['name'], '--dir', str(destination)], check=True)
                    count += 1
                if len(artifacts) < 100:
                    break
                artifact_page += 1
        if len(runs) < 100:
            break
        page += 1
print(f'Collected {count} reviewer usage artifacts; prior-to-activation usage is unavailable.')
