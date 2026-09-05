import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  computePayrun,
  getPayrun,
  markPayrunPaid,
  resolveWarning,
  validatePayrun,
} from "../../api/payroll.api";
import { useAuth } from "../../context/AuthContext.jsx";

export default function PayrunProcessing() {
  const { id } = useParams();
  const { user } = useAuth();
  const manager = ["Admin", "HR Payroll Manager"].includes(user.role);
  const [run, setRun] = useState(null);
  const [error, setError] = useState("");
  const load = () =>
    getPayrun(id)
      .then(({ data }) => setRun(data))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load payrun"),
      );
  useEffect(() => {
    load();
  }, [id]);
  async function action(fn) {
    setError("");
    try {
      await fn(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Payrun action failed");
    }
  }
  if (!run) return <div className="page">Loading payrun...</div>;
  return (
    <div className="page">
      <div className="page-header">
        <h1>{run.name}</h1>
        <span>{run.status}</span>
      </div>
      <p>
        {run.salaryStructure?.name} | {String(run.periodStart).slice(0, 10)} to{" "}
        {String(run.periodEnd).slice(0, 10)}
      </p>
      {error && <div className="form-error">{error}</div>}
      <div className="page-header-actions">
        <button
          className="btn btn-primary"
          disabled={run.status !== "draft"}
          onClick={() => action(computePayrun)}
        >
          Compute
        </button>
        <button
          className="btn btn-primary"
          disabled={run.status !== "computed"}
          onClick={() => action(validatePayrun)}
        >
          Validate
        </button>
        <button
          className="btn btn-primary"
          disabled={!manager || run.status !== "validated"}
          onClick={() => action(markPayrunPaid)}
        >
          Mark Paid
        </button>
        <button className="btn btn-ghost" disabled>
          Send Payslips
        </button>
      </div>
      <h2>Warnings</h2>
      <table className="data-table">
        <tbody>
          {run.warnings?.map((warning) => (
            <tr key={warning.id}>
              <td>{warning.severity}</td>
              <td>{warning.message}</td>
              <td>
                {!warning.resolved && manager && (
                  <button
                    className="btn btn-small"
                    onClick={() => resolveWarning(id, warning.id).then(load)}
                  >
                    Resolve
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Payslips</h2>
      <table className="data-table">
        <tbody>
          {run.payslips?.map((slip) => (
            <tr key={slip.id}>
              <td>{slip.employee?.name}</td>
              <td>{String(slip.grossAmount)}</td>
              <td>{String(slip.netAmount)}</td>
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
