const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.goto('https://detail.1688.com/offer/1002546674170.html', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    const data = await page.evaluate(() => window.context?.result?.data || { error: 'No data' });
    fs.writeFileSync('debug.json', JSON.stringify(data, null, 2));
    await browser.close();
    console.log('done');
})();