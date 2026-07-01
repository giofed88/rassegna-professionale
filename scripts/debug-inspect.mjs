import { chromium } from 'playwright';

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

async function inspectDgtRassegnaStructure(browser) {
  const page = await browser.newPage();
  try {
    await page.goto('https://www.dgt.mef.gov.it/gt/rassegna-sentenze-tributarie', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const matches = all.filter((el) => {
        const own = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent)
          .join('');
        return /Sentenza del|Ordinanza del/.test(own);
      });
      return matches.slice(0, 6).map((el) => {
        const chain = [];
        let cur = el;
        for (let i = 0; i < 6 && cur; i++) {
          chain.push({
            tag: cur.tagName,
            class: cur.getAttribute && cur.getAttribute('class'),
            id: cur.getAttribute && cur.getAttribute('id')
          });
          cur = cur.parentElement;
        }
        return { text: el.textContent.trim().slice(0, 100), chain };
      });
    });

    console.log('\n=== DGT SENTENZE - STRUTTURA DOM (v2) ===');
    console.log('MATCH COUNT (leaf-text):', result.length);
    console.log(JSON.stringify(result, null, 2));

    const containerHtml = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const el = all.find((e) => {
        const own = Array.from(e.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent)
          .join('');
        return /Sentenza del|Ordinanza del/.test(own);
      });
      if (!el) return null;
      let container = el;
      for (let i = 0; i < 3; i++) container = container.parentElement || container;
      return container.outerHTML.slice(0, 4000);
    });
    console.log('CONTAINER HTML SAMPLE (3 levels up):', containerHtml);

    const linkNear = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const el = all.find((e) => {
        const own = Array.from(e.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent)
          .join('');
        return /Sentenza del|Ordinanza del/.test(own);
      });
      if (!el) return null;
      let cur = el;
      for (let i = 0; i < 6 && cur; i++) {
        const a = cur.querySelector ? cur.querySelector('a[href]') : null;
        if (a) return { level: i, href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 80) };
        cur = cur.parentElement;
      }
      return null;
    });
    console.log('NEAREST LINK:', JSON.stringify(linkNear));
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
