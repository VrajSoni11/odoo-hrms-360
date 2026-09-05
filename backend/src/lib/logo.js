const fs = require('fs');
const path = require('path');

// The payslip PDF (rendered via Puppeteer from a raw HTML string) and the
// payslip delivery email (rendered via Nodemailer) have no base URL to
// resolve a relative "/logo.png" against, so the logo is embedded directly
// as a base64 data URI instead.
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo-128.png');

let cachedDataUri;

function getLogoDataUri() {
  if (cachedDataUri === undefined) {
    try {
      const buffer = fs.readFileSync(LOGO_PATH);
      cachedDataUri = `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (err) {
      console.warn('Could not load logo asset for PDF/email branding:', err.message);
      cachedDataUri = null;
    }
  }
  return cachedDataUri;
}

module.exports = { getLogoDataUri };
