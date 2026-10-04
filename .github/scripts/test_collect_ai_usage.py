import importlib.util
import json
import pathlib
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('collector', pathlib.Path(__file__).with_name('collect-ai-usage.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

class CollectorTest(unittest.TestCase):
    def test_exhausts_pages_and_collects_retained_reruns_without_age_assumptions(self):
        calls=[]
        def api(args, **kwargs):
            endpoint=args[2];calls.append(endpoint)
            if 'artifacts?' in endpoint:
                if 'page=1' in endpoint:
                    return json.dumps({'artifacts':[{'id':i,'name':'unrelated','expired':False} for i in range(100)]})
                return json.dumps({'artifacts':[
                    {'id':101,'name':'ai-usage-44-1','expired':False,'workflow_run':{'id':44}},
                    {'id':102,'name':'ai-usage-44-2','expired':False,'workflow_run':{'id':44}},
                    {'id':103,'name':'ai-usage-45-1','expired':False,'workflow_run':{'id':45}},
                    {'id':104,'name':'ai-usage-44-3','expired':True,'workflow_run':{'id':44}}]})
            return json.dumps({'event':'pull_request_target' if endpoint.endswith('/44') else 'pull_request',
                               'path':'.github/workflows/ai-production-review.yml', 'created_at':'2025-01-01T00:00:00Z'})
        with tempfile.TemporaryDirectory() as directory, patch.object(subprocess,'check_output',side_effect=api), patch.object(subprocess,'run') as download:
            self.assertEqual(collector.collect('brofk/Epignosis',pathlib.Path(directory)),2)
            self.assertEqual(download.call_count,2)
            self.assertEqual(sum(c.endswith('/44') for c in calls),1)
            self.assertTrue(any('page=2' in c for c in calls))
    def test_download_failure_fails_collection(self):
        artifact={'id':1,'name':'ai-usage-44-1','expired':False,'workflow_run':{'id':44}}
        def api(args,**kwargs):
            return json.dumps({'artifacts':[artifact]} if 'artifacts?' in args[2] else {'event':'pull_request_target','path':'.github/workflows/ai-production-review.yml'})
        with tempfile.TemporaryDirectory() as directory, patch.object(subprocess,'check_output',side_effect=api), patch.object(subprocess,'run',side_effect=RuntimeError('download failed')):
            with self.assertRaises(RuntimeError): collector.collect('brofk/Epignosis',pathlib.Path(directory))

if __name__ == '__main__': unittest.main()
