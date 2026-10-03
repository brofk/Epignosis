import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('tracked', ROOT / 'scripts/security/check-tracked-secrets.py')
tracked = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tracked)

class SecretControls(unittest.TestCase):
    def test_sensitive_file_names(self):
        for path in ['.env', 'app/.env.production', 'app/.env.local', '.dev.vars', 'credentials.json', 'cert.pem', 'service-account-prod.json']:
            self.assertTrue(tracked.sensitive(path), path)
        for path in ['.env.example', 'app/.env.example', 'cloudflare-env.d.ts', 'package.json']:
            self.assertFalse(tracked.sensitive(path), path)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.repo = Path(self.temp.name)
        subprocess.run(['git', 'init', '-q', self.repo], check=True)
        for path in ['.gitleaks.toml', 'scripts/security/scan-secrets.sh', 'scripts/security/check-tracked-secrets.py']:
            target = self.repo / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / path, target)
        self.git('config', 'user.name', 'Scanner test')
        self.git('config', 'user.email', 'scanner@example.invalid')
        self.git('add', '.')
        self.git('commit', '-qm', 'clean controls')

    def tearDown(self):
        self.temp.cleanup()

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.repo, check=True, capture_output=True)

    def scan(self, mode='staged', env=None):
        return subprocess.run(['sh', 'scripts/security/scan-secrets.sh', mode], cwd=self.repo, env=env, capture_output=True, text=True)

    def test_clean_stage_and_history_pass(self):
        self.assertEqual(self.scan().returncode, 0)
        self.assertEqual(self.scan('history').returncode, 0)

    def test_tracked_env_is_rejected_even_without_a_secret(self):
        (self.repo / '.env.production').write_text('SETTING=public\n')
        self.git('add', '.env.production')
        self.assertNotEqual(self.scan().returncode, 0)

    def test_staged_and_historical_key_are_rejected_without_value_in_output(self):
        synthetic = '_'.join(['sk', 'live', 'AbCdEf1234567890AbCdEf1234567890'])
        (self.repo / 'bad.js').write_text('const key = "' + synthetic + '";\n')
        self.git('add', 'bad.js')
        result = self.scan()
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(synthetic, result.stdout + result.stderr)
        self.git('commit', '-qm', 'synthetic incident')
        self.git('rm', 'bad.js')
        self.git('commit', '-qm', 'delete fixture')
        self.assertNotEqual(self.scan('history').returncode, 0)

    def test_historical_fixture_exception_does_not_allow_same_value_elsewhere(self):
        import re
        cfg = (ROOT / '.gitleaks.toml').read_text()
        synthetic = re.search(r'\^((?:sk)_live_[A-Za-z0-9]+)\$', cfg).group(1)
        (self.repo / 'another-test.js').write_text('const token="' + synthetic + '";\n')
        self.git('add', 'another-test.js')
        self.assertNotEqual(self.scan().returncode, 0)

    def test_missing_scanner_fails_closed(self):
        tools = self.repo / 'only-git'
        tools.mkdir()
        (tools / 'git').symlink_to(shutil.which('git'))
        env = dict(os.environ, PATH=str(tools))
        # Launch the shell by absolute path so the absent scanner is the condition tested.
        result = subprocess.run(['/bin/sh', 'scripts/security/scan-secrets.sh'], cwd=self.repo, env=env, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b'install Gitleaks', result.stderr)
