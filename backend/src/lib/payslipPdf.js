const puppeteer = require('puppeteer');

let browserPromise;

async function getBrowser() {
  browserPromise ||= puppeteer.launch({ headless: true });
  return browserPromise;
}

async function renderPayslipPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = undefined;
  }
}

module.exports = { renderPayslipPdf, closeBrowser };
