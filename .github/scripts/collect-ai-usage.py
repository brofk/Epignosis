"""Collect only trusted reviewer artifacts, using gh's authenticated download handling."""
import datetime
import json
import os
import pathlib
import re
import subprocess

repo = os.environ['GITHUB_REPOSITORY']
if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo):
    raise ValueError('Invalid repository')

def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], text=True))

root = pathlib.Path('telemetry')
root.mkdir(exist_ok=True)
cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=15)
count = 0
for page in range(1, 101):
    artifacts = api(f'repos/{repo}/actions/artifacts?per_page=100&page={page}')['artifacts']
    for artifact in artifacts:
        if not re.fullmatch(r'ai-usage-\d+-\d+', artifact['name']) or artifact['expired']:
            continue
        if datetime.datetime.fromisoformat(artifact['created_at'].replace('Z', '+00:00')) < cutoff:
            continue
        run_id = artifact['workflow_run']['id']
        run = api(f'repos/{repo}/actions/runs/{run_id}')
        if run['event'] != 'pull_request_target' or run['path'] != '.github/workflows/ai-production-review.yml':
            continue
        destination = root / str(artifact['id'])
        destination.mkdir(exist_ok=True)
        subprocess.run(['gh', 'run', 'download', str(run_id), '--repo', repo,
                        '--name', artifact['name'], '--dir', str(destination)], check=True)
        count += 1
    if len(artifacts) < 100:
        break
else:
    raise RuntimeError('Artifact pagination limit reached; cannot claim complete collection')
print(f'Collected {count} reviewer usage artifacts; prior-to-activation usage is unavailable.')
