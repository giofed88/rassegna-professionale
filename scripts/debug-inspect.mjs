import { chromium } from 'playwright';

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

async function inspectDgtRassegnaStructure(browser) {
  const page = await browser.newPage();
  try {
    await page.goto('https://www.dgt.mef.gov.it/gt/rassegna-sentenze-tributarie', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    try {
      await page.waitForFunction(
        () => /Sentenza del|Ordinanza del/.test(document.body.innerText),
        { timeout: 15000 }
      );
    } catch {
      console.log('[WARN] Testo "Sentenza del" non apparso entro 15s');
    }
    await page.waitForTimeout(1500);

    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    console.log('BODY HTML LENGTH:', bodyHtml.length);

    const idx = bodyHtml.indexOf('Sentenza del');
    const idx2 = bodyHtml.indexOf('Ordinanza del');
    const anchorIdx = idx !== -1 ? idx : idx2;
    console.log('ANCHOR INDEX:', anchorIdx);

    if (anchorIdx !== -1) {
      const start = Math.max(0, anchorIdx - 3000);
      const snippet = bodyHtml.slice(start, anchorIdx + 2000);
      console.log('=== HTML SNIPPET AROUND MATCH ===');
      console.log(snippet);
    } else {
      console.log('=== NO MATCH: full body text ===');
      const text = await page.evaluate(() => document.body.innerText.slice(0, 3000));
      console.log(text);
    }
  } catch (err) {
    console.error('[ERR] DGT structure inspect:', err.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  try {
    await inspectDgtRassegnaStructure(browser);
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
