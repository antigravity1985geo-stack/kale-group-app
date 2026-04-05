const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.error('LOG:', msg.text()));
    page.on('pageerror', err => console.error('ERROR:', err.message));
    await page.goto('http://localhost:3000', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));
    const text = await page.evaluate(() => document.body.innerText);
    console.error('PAGE TEXT:', text.substring(0, 200));
    await browser.close();
  } catch (e) {
    console.error('SCRIPT ERROR:', e);
    process.exit(1);
  }
})();
