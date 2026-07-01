import { chromium } from 'playwright';

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

async function inspectEutekneLoginDeep(browser) {
  const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });
  try {
    await page.goto('https://www.eutekne.it/Public/Login.aspx', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    const html = await page.content();
    const iframes = await page.$$eval('iframe', (els) => els.map((e) => e.getAttribute('src')));
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.log('\n=== EUTEKNE LOGIN DEEP ===');
    console.log('HTML LENGTH:', html.length);
    console.log('IFRAMES:', JSON.stringify(iframes));
    console.log('BODY TEXT:', bodyText);
    console.log('HTML SNIPPET (first 2000 chars):', html.slice(0, 2000));
  } catch (err) {
    console.error('[ERR] Eutekne deep inspect:', err.message);
  } finally {
    await page.close();
  }
}

async function inspectDgtRassegna(browser) {
  const page = await browser.newPage();
  try {
    await page.goto('https://www.dgt.mef.gov.it/gt/rassegna-sentenze-tributarie', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    const links = await page.$$eval('a', (els) =>
      els
        .filter((el) => el.getAttribute('href') && el.textContent.trim().length > 15)
        .slice(0, 20)
        .map((el) => ({ text: el.textContent.trim().slice(0, 80), href: el.getAttribute('href') }))
    );
    console.log('\n=== DGT RASSEGNA SENTENZE TRIBUTARIE ===');
    console.log('TITLE:', title);
    console.log('BODY TEXT:', bodyText);
    console.log('LINKS:', JSON.stringify(links, null, 2));
  } catch (err) {
    console.error('[ERR] DGT rassegna inspect:', err.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  try {
    await inspectEutekneLoginDeep(browser);
    await inspectDgtRassegna(browser);
  } finally {
    await browser.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
