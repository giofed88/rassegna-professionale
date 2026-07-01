import { chromium } from 'playwright';

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

async function dumpInputs(page, label) {
  const inputs = await page.$$eval('input', (els) =>
    els.map((el) => ({
      tag: 'input',
      name: el.getAttribute('name'),
      id: el.getAttribute('id'),
      type: el.getAttribute('type'),
      placeholder: el.getAttribute('placeholder')
    }))
  );
  const buttons = await page.$$eval('button, a', (els) =>
    els
      .filter((el) => /accedi|login|prosegui|entra|submit|cerca|search/i.test(el.textContent + ' ' + (el.className || '')))
      .slice(0, 15)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent.trim().slice(0, 40),
        class: el.getAttribute('class'),
        id: el.getAttribute('id'),
        href: el.getAttribute('href')
      }))
  );
  console.log(`\n=== ${label} ===`);
  console.log('INPUTS:', JSON.stringify(inputs, null, 2));
  console.log('BUTTONS/LINKS:', JSON.stringify(buttons, null, 2));
}

async function inspectEutekneLogin(browser) {
  const page = await browser.newPage();
  try {
    await page.goto('https://www.eutekne.it/Public/Login.aspx', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dumpInputs(page, 'EUTEKNE LOGIN PAGE');
  } catch (err) {
    console.error('[ERR] Eutekne login inspect:', err.message);
  } finally {
    await page.close();
  }
}

async function inspectDgtMef(browser) {
  const page = await browser.newPage();
  try {
    await page.goto('https://www.dgt.mef.gov.it/gt/servizio-consultazione-pubblica-contenziosi-tributari', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1500));
    const forms = await page.$$eval('form', (els) =>
      els.map((f) => ({ action: f.getAttribute('action'), method: f.getAttribute('method') }))
    );
    const links = await page.$$eval('a', (els) =>
      els
        .filter((el) => /consultazione|ricerca|sentenz|cerca/i.test(el.textContent))
        .slice(0, 15)
        .map((el) => ({ text: el.textContent.trim().slice(0, 60), href: el.getAttribute('href') }))
    );
    console.log('\n=== DGT MEF PAGE ===');
    console.log('TITLE:', title);
    console.log('FORMS:', JSON.stringify(forms, null, 2));
    console.log('RELEVANT LINKS:', JSON.stringify(links, null, 2));
    console.log('BODY TEXT SNIPPET:', bodyText);
  } catch (err) {
    console.error('[ERR] DGT MEF inspect:', err.message);
  } finally {
    await page.close();
  }
}

async function inspectEutekneGiurisprudenza(browser) {
  const username = process.env.EUTEKNE_USERNAME;
  const password = process.env.EUTEKNE_PASSWORD;
  if (!username || !password) {
    console.log('[INFO] Credenziali Eutekne mancanti, salto ispezione rassegna giurisprudenza.');
    return;
  }
  const page = await browser.newPage();
  try {
    await page.goto('https://www.eutekne.it/Public/Login.aspx', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const usernameInputs = await page.$$('input[type="text"], input[type="email"]');
    const passwordInputs = await page.$$('input[type="password"]');
    if (usernameInputs.length && passwordInputs.length) {
      await usernameInputs[0].fill(username);
      await passwordInputs[0].fill(password);
      const loginBtn = await page.$('a.o-btn-prosegui, button[type=submit], input[type=submit]');
      if (loginBtn) {
        await loginBtn.click();
        await page.waitForTimeout(3000);
      }
    }
    await page.goto('https://www.eutekne.it/Servizi/RassegnaGiurisprudenza/default.aspx', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);
    const url = page.url();
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
    console.log('\n=== EUTEKNE RASSEGNA GIURISPRUDENZA (post-login attempt) ===');
    console.log('FINAL URL:', url);
    console.log('TITLE:', title);
    console.log('BODY SNIPPET:', bodyText);
    await dumpInputs(page, 'EUTEKNE GIURISPRUDENZA PAGE');
  } catch (err) {
    console.error('[ERR] Eutekne giurisprudenza inspect:', err.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  try {
    await inspectEutekneLogin(browser);
    await inspectDgtMef(browser);
    await inspectEutekneGiurisprudenza(browser);
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
