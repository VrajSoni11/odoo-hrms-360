import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, FileText } from "lucide-react";
import { getPayslips } from "../../api/payroll.api";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { SkeletonTable } from "../../components/ui/Skeleton.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

export default function PayslipsPage() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    getPayslips()
      .then(({ data }) => setSlips(data))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load payslips"),
      )
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1>Payslips</h1>
          <div className="page-subtitle">{loading ? "Loading…" : `${slips.length} payslip(s)`}</div>
        </div>
      </div>
      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}

      {loading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : slips.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No payslips yet"
          description="Payslips appear here once a payrun has been computed."
        />
      ) : (
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
                <td><StatusBadge status={slip.status} /></td>
                <td>
                  <Link to={`/payroll/payslips/${slip.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
