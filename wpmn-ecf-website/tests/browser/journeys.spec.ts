import {test,expect} from '@playwright/test';
test('home, approved article and public images load without application errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await expect(page.locator('h1')).toBeVisible();
 await page.goto('/articles/why-the-gospel-is-about-what-christ-has-done');
 await expect(page.locator('h1')).toHaveText('Why the Gospel Is About What Christ Has Done');
 await expect(page.locator('main')).toContainText('Christ died for our sins');
 for(const path of ['/images/ecf-horizontal.png','/images/ecf-horizontal-white.png','/images/ecf-brandmark.png','/images/ecf-primary-white.png','/images/shared-life.jpg']){
  const r=await page.request.get(path);expect(r.status()).toBe(200);expect((await r.body()).length).toBeGreaterThan(1000);
 }
 expect(errors).toEqual([]);
});
test('visitor form uses local preferences, requires consent and reaches the real local API',async({page})=>{
 await page.goto('/visit');
 await page.getByLabel('First name', {exact:false}).fill('Synthetic Browser Visitor');
 await page.getByLabel('Email', {exact:true}).fill('browser@example.test');
 const zone=await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone);
 await expect(page.getByLabel('Your time zone', {exact:false})).toHaveValue(zone);
 await page.getByLabel('Preferred visit date').fill('2026-10-05');
 await page.getByRole('button',{name:'Send message'}).click();await expect(page.getByRole('alert')).toContainText('confirm');
 await page.getByRole('checkbox',{name:'Consent to contact information use'}).check();
 const requestPromise=page.waitForRequest(r=>r.url().endsWith('/api/contact')&&r.method()==='POST');
 await page.getByRole('button',{name:'Send message'}).click();
 const request=await requestPromise;expect(request.postDataJSON().data.timeZone).toBe(zone);expect(request.postDataJSON().data.visitDate).toBe('2026-10-05');
 await expect(page.getByRole('status')).toContainText('Thank you for reaching out.');
});
test('anonymous prayer works without contact details and private editor access is denied',async({page})=>{
 await page.goto('/prayer');await page.getByLabel('Prayer request',{exact:false}).fill('SYNTHETIC_BROWSER_PRAYER_ONLY');
 await page.getByRole('checkbox',{name:'Consent to contact information use'}).check();
 await page.getByRole('button',{name:'Send prayer request'}).click();await expect(page.getByRole('status')).toContainText('You have not requested follow-up');
 const response=await page.request.get('/api/editor');expect(response.status()).toBe(403);expect(await response.text()).not.toContain('SYNTHETIC_BROWSER_PRAYER_ONLY');
});
test('sitemap contains the published article and excludes private editor paths',async({request})=>{
 const response=await request.get('/sitemap.xml');expect(response.status()).toBe(200);
 const text=await response.text();expect(text).toContain('/articles/why-the-gospel-is-about-what-christ-has-done');expect(text).not.toContain('/editor');
 expect(text).toContain('http://127.0.0.1:4174/');
});
