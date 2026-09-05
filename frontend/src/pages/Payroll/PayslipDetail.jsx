import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { downloadPayslipPdf, getPayslip } from "../../api/payroll.api";

export default function PayslipDetail() {
  const { id } = useParams();
  const [slip, setSlip] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    getPayslip(id)
      .then(({ data }) => setSlip(data))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load payslip"),
      );
  }, [id]);
  if (error)
    return (
      <div className="page">
        <div className="form-error">{error}</div>
      </div>
    );
  if (!slip) return <div className="page">Loading payslip...</div>;
  async function printPayslip() {
    setDownloading(true);
    try {
      const response = await downloadPayslipPdf(id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payslip-${slip.employeeId}-${String(slip.periodStart).slice(0, 10)}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.response?.data?.error || "Could not download payslip PDF");
    } finally {
      setDownloading(false);
    }
  }
  const grouped = slip.lines.reduce((groups, line) => {
    (groups[line.category] ||= []).push(line);
    return groups;
  }, {});
  return (
    <div className="page">
      <div className="page-header">
        <h1>Payslip: {slip.employee?.name}</h1>
        <span>{slip.status}</span>
      </div>
      <p>
        {slip.payrun?.name} | {String(slip.periodStart).slice(0, 10)} to{" "}
        {String(slip.periodEnd).slice(0, 10)} | Worked days:{" "}
        {String(slip.workedDays)}
      </p>
      <button
        className="btn btn-primary"
        onClick={printPayslip}
        disabled={downloading}
      >
        {downloading ? "Preparing PDF..." : "Print Payslip"}
      </button>
      {Object.entries(grouped).map(([category, lines]) => (
        <section key={category}>
          <h2>{category}</h2>
          <table className="data-table">
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.ruleName}</td>
                  <td>{String(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <h2>
        Gross: {String(slip.grossAmount)} | Net: {String(slip.netAmount)}
      </h2>
    </div>
  );
}
