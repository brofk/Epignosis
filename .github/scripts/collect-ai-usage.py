"""Collect retained reviewer telemetry. gh handles authenticated artifact redirects."""
import json
import os
import pathlib
import re
import subprocess

def collect(repo, root=pathlib.Path('telemetry')):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo):
        raise ValueError('Invalid repository')
    def api(path):
        return json.loads(subprocess.check_output(['gh', 'api', path], text=True))
    root.mkdir(exist_ok=True)
    count, page = 0, 1
    trusted_runs = {}
    # Exhaust pagination without depending on undocumented ordering or creation
    # dates. A rerun can create new billable telemetry on a much older run.
    while True:
        artifacts = api(f'repos/{repo}/actions/artifacts?per_page=100&page={page}')['artifacts']
        for artifact in artifacts:
            if not re.fullmatch(r'ai-usage-\d+-\d+', artifact['name']) or artifact['expired']:
                continue
            run_id = artifact['workflow_run']['id']
            if run_id not in trusted_runs:
                run = api(f'repos/{repo}/actions/runs/{run_id}')
                trusted_runs[run_id] = run['event'] == 'pull_request_target' and run['path'] == '.github/workflows/ai-production-review.yml'
            if not trusted_runs[run_id]:
                continue
            destination = root / str(artifact['id'])
            destination.mkdir(exist_ok=True)
            subprocess.run(['gh', 'run', 'download', str(run_id), '--repo', repo,
                            '--name', artifact['name'], '--dir', str(destination)], check=True)
            count += 1
        if len(artifacts) < 100:
            break
        page += 1
    print(f'Collected {count} retained reviewer usage artifacts; prior-to-activation usage is unavailable.')
    return count

if __name__ == '__main__':
    collect(os.environ['GITHUB_REPOSITORY'])
