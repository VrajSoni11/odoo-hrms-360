function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function payslipTemplate(payslip) {
  const grouped = payslip.lines.reduce((groups, line) => {
    (groups[line.category] ||= []).push(line);
    return groups;
  }, {});
  const rows = ["basic", "allowance", "deduction"]
    .flatMap((category) =>
      (grouped[category] || []).map(
        (line) =>
          `<tr><td>${line.ruleName}</td><td>${category}</td><td class="amount">${money(line.amount)}</td></tr>`,
      ),
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#20232a;margin:0;padding:36px;background:#fff}header{border-bottom:3px solid #714b67;padding-bottom:18px;margin-bottom:24px}h1{margin:0;color:#714b67;font-size:28px}h2{margin:26px 0 10px;font-size:16px;text-transform:uppercase;letter-spacing:.04em;color:#555}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 28px;margin-top:18px;font-size:13px}.meta strong{color:#333}.status{display:inline-block;background:#e8dbe5;color:#714b67;padding:4px 10px;border-radius:12px;text-transform:capitalize;font-weight:bold}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;background:#f1eef2;color:#555;padding:10px}td{border-bottom:1px solid #ddd;padding:10px}.amount{text-align:right;font-variant-numeric:tabular-nums}.total{display:flex;justify-content:space-between;padding:14px 16px;margin-top:10px;font-weight:bold;font-size:16px;border-radius:5px}.gross{background:#f1eef2}.net{background:#714b67;color:#fff;font-size:20px}footer{margin-top:50px;padding-top:14px;border-top:1px solid #ddd;color:#777;font-size:11px;display:flex;justify-content:space-between}</style></head><body><header><h1>PeoplePay360</h1><div>Salary Payslip</div><div class="meta"><div><strong>Employee:</strong> ${payslip.employee?.name || ""}</div><div><strong>Job position:</strong> ${payslip.contract?.jobPosition || "—"}</div><div><strong>Period:</strong> ${String(payslip.periodStart).slice(0, 10)} to ${String(payslip.periodEnd).slice(0, 10)}</div><div><strong>Payrun:</strong> ${payslip.payrun?.name || ""}</div><div><strong>Structure:</strong> ${payslip.payrun?.salaryStructure?.name || "—"}</div><div><strong>Status:</strong> <span class="status">${payslip.status}</span></div></div></header><h2>Rule breakdown</h2><table><thead><tr><th>Rule</th><th>Category</th><th class="amount">Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="total gross"><span>Gross</span><span>${money(payslip.grossAmount)}</span></div><div class="total net"><span>Net Pay</span><span>${money(payslip.netAmount)}</span></div><footer><span>Generated on ${new Date().toLocaleString()}</span><span>System-generated document</span></footer></body></html>`;
}

module.exports = payslipTemplate;
