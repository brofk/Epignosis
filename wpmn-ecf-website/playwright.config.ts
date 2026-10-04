import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',fullyParallel:false,workers:1,forbidOnly:!!process.env.CI,retries:0,
 timeout:30000,reporter:'list',use:{baseURL:'http://127.0.0.1:4174',trace:'retain-on-failure'},
 projects:[
  {name:'India desktop',use:{browserName:'chromium',locale:'en-IN',timezoneId:'Asia/Kolkata'}},
  {name:'Ghana mobile',use:{browserName:'chromium',locale:'en-GH',timezoneId:'Africa/Accra',viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
 ],
 webServer:{command:'node scripts/browser-server.mjs',url:'http://127.0.0.1:4174',reuseExistingServer:false,timeout:120000}
});
