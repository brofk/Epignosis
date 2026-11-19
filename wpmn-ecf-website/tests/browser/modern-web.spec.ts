import {test,expect} from '@playwright/test';
test('mobile menu and page reflow remain usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.locator('main h1')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Open menu'}).click();
 await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open menu'})).toBeFocused();
 await expect(page.locator('.hero-photo')).toHaveAttribute('srcset',/640w/);
});
test('custom form errors receive focus and clear when corrected',async({page})=>{
 await page.goto('/visit');await page.getByLabel('First name',{exact:false}).fill('Synthetic Visitor');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.locator('#contact-error')).toBeFocused();
 await expect(page.getByRole('checkbox',{name:'Consent to contact information use'})).toHaveAttribute('aria-invalid','true');
 await page.getByRole('checkbox',{name:'Consent to contact information use'}).check();
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.locator('#contact-error')).toBeFocused();
 await expect(page.getByLabel('Email',{exact:true})).toHaveAttribute('aria-describedby','contact-error');
 await page.getByLabel('Email',{exact:true}).fill('synthetic@example.test');
 await expect(page.locator('#contact-error')).toHaveCount(0);
});
