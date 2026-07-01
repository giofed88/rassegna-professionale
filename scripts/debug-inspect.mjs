import { chromium } from 'playwright';

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

async function inspectDgtRassegnaStructure(browser) {
  const page = await browser.newPage();
  try {
    await page.goto('https://www.dgt.mef.gov.it/gt/rassegna-sentenze-tributarie', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const matches = all.filter((el) =>
        el.children.length === 0 && /Sentenza del|Ordinanza del/.test(el.textContent || '')
      );
      return matches.slice(0, 5).map((el) => {
        const chain = [];
        let cur = el;
        for (let i = 0; i < 5 && cur; i++) {
          chain.push({
            tag: cur.tagName,
            class: cur.getAttribute && cur.getAttribute('class'),
            href: cur.getAttribute && cur.getAttribute('href')
          });
          cur = cur.parentElement;
        }
        return { text: el.textContent.trim().slice(0, 100), chain };
      });
    });

    console.log('\n=== DGT SENTENZE - STRUTTURA DOM ===');
    console.log(JSON.stringify(result, null, 2));

    const containerHtml = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(
        (e) => e.children.length === 0 && /Sentenza del|Ordinanza del/.test(e.textContent || '')
      );
      if (!el) return null;
      let container = el;
      for (let i = 0; i < 4; i++) container = container.parentElement || container;
      return container.outerHTML.slice(0, 3000);
    });
    console.log('CONTAINER HTML SAMPLE:', containerHtml);
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
