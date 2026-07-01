import { chromium } from 'playwright';

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

async function inspectDgtRassegnaStructure(browser) {
  const page = await browser.newPage();
  try {
    await page.goto('https://www.dgt.mef.gov.it/gt/rassegna-sentenze-tributarie', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      const needles = ['TFM dell', 'Rinuncia all', 'Superbonus', 'Operazioni soggettivamente'];
      const all = Array.from(document.querySelectorAll('a, h1, h2, h3, h4, h5, p, div, span, li'));
      const found = [];
      for (const needle of needles) {
        const el = all.find((e) => {
          const own = Array.from(e.childNodes)
            .filter((n) => n.nodeType === 3)
            .map((n) => n.textContent)
            .join('');
          return own.includes(needle);
        });
        if (!el) {
          found.push({ needle, error: 'not found as own text' });
          continue;
        }
        const chain = [];
        let cur = el;
        for (let i = 0; i < 6 && cur; i++) {
          chain.push({
            tag: cur.tagName,
            class: cur.getAttribute && cur.getAttribute('class'),
            href: cur.tagName === 'A' ? cur.getAttribute('href') : undefined
          });
          cur = cur.parentElement;
        }
        found.push({ needle, tag: el.tagName, chain });
      }
      return found;
    });

    console.log('\n=== TITLE ELEMENTS CHAIN ===');
    console.log(JSON.stringify(result, null, 2));

    const containerSample = await page.evaluate(() => {
      const needle = 'TFM dell';
      const all = Array.from(document.querySelectorAll('*'));
      const el = all.find((e) => {
        const own = Array.from(e.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent)
          .join('');
        return own.includes(needle);
      });
      if (!el) return null;
      let container = el;
      for (let i = 0; i < 3; i++) container = container.parentElement || container;
      return container.outerHTML;
    });
    console.log('=== CONTAINER OUTER HTML (3 levels up from title) ===');
    console.log(containerSample ? containerSample.slice(0, 3000) : 'NOT FOUND');
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
