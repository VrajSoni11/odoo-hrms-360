const nodemailer = require('nodemailer');
const { getLogoDataUri } = require('./logo');

let transportPromise;

async function getTransport() {
  if (!transportPromise) {
    transportPromise = nodemailer.createTestAccount().then((account) => nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
    }));
  }
  return transportPromise;
}

async function sendPayslipEmail({ to, employeeName, periodLabel, pdfBuffer }) {
  if (!to) return { success: false, previewUrl: null, error: 'Employee has no work email address' };
  try {
    const transport = await getTransport();
    const logo = getLogoDataUri();
    const logoImg = logo
      ? `<img src="${logo}" alt="PeoplePay360" width="40" height="40" style="border-radius:10px;vertical-align:middle;margin-right:10px" />`
      : '';
    const info = await transport.sendMail({
      from: 'PeoplePay360 Payroll <payroll@peoplepay360.test>',
      to,
      subject: `Payslip for ${employeeName} - ${periodLabel}`,
      text: `Hello ${employeeName}, your payslip for ${periodLabel} is attached.`,
      html: `<div style="font-family:Arial,sans-serif;color:#20232a"><div style="display:flex;align-items:center;margin-bottom:16px">${logoImg}<strong style="font-size:18px;color:#714b67">PeoplePay360</strong></div><p>Hello ${employeeName},</p><p>Your payslip for <strong>${periodLabel}</strong> is attached.</p><p>Regards,<br>PeoplePay360 Payroll</p></div>`,
      attachments: [{ filename: `payslip-${periodLabel.replace(/[^0-9-]/g, '') || 'period'}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
    });
    return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) || null, error: null };
  } catch (error) {
    transportPromise = undefined;
    return { success: false, previewUrl: null, error: error.message || 'Email delivery failed' };
  }
}

module.exports = { sendPayslipEmail };
