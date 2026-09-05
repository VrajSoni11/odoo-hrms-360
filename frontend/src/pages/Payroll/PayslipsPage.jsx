import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPayslips } from "../../api/payroll.api";

export default function PayslipsPage() {
  const [slips, setSlips] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    getPayslips()
      .then(({ data }) => setSlips(data))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load payslips"),
      );
  }, []);
  return (
    <div className="page">
      <div className="page-header">
        <h1>Payslips</h1>
      </div>
      {error && <div className="form-error">{error}</div>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Payrun</th>
            <th>Period</th>
            <th>Gross</th>
            <th>Net</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {slips.map((slip) => (
            <tr key={slip.id}>
              <td>{slip.employee?.name}</td>
              <td>{slip.payrun?.name}</td>
              <td>
                {String(slip.periodStart).slice(0, 10)} to{" "}
                {String(slip.periodEnd).slice(0, 10)}
              </td>
              <td>{String(slip.grossAmount)}</td>
              <td>{String(slip.netAmount)}</td>
              <td>{slip.status}</td>
              <td>
                <Link to={`/payroll/payslips/${slip.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
