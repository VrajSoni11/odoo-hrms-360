import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  computePayrun,
  getPayrun,
  markPayrunPaid,
  resolveWarning,
  sendPayslips,
  validatePayrun,
} from "../../api/payroll.api";
import { useAuth } from "../../context/AuthContext.jsx";

export default function PayrunProcessing() {
  const { id } = useParams();
  const { user } = useAuth();
  const manager = ["Admin", "HR Payroll Manager"].includes(user.role);
  const [run, setRun] = useState(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
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
  async function handleSendPayslips() {
    setError("");
    setSendResult(null);
    setSending(true);
    try {
      const { data } = await sendPayslips(id);
      setSendResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send payslips");
    } finally {
      setSending(false);
    }
  }
  if (!run) return <div className="page">Loading payrun...</div>;
  const canSend = ["validated", "paid"].includes(run.status);
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
        <button
          className="btn btn-primary"
          disabled={!canSend || sending}
          onClick={handleSendPayslips}
        >
          {sending ? "Sending..." : "Send Payslips"}
        </button>
      </div>

      {sendResult && (
        <section style={{ marginTop: "24px" }}>
          <div className="page-header">
            <h2>Email Delivery Results</h2>
            <span>
              Sent: <strong>{sendResult.sent}</strong> | Failed:{" "}
              <strong>{sendResult.failed}</strong>
            </span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {sendResult.details?.map((detail, index) => (
                <tr key={index}>
                  <td>{detail.employeeName}</td>
                  <td>
                    {detail.status === "sent" ? (
                      <span style={{ color: "var(--success)", fontWeight: 600 }}>
                        ✓ Sent
                      </span>
                    ) : (
                      <span style={{ color: "var(--danger)", fontWeight: 600 }}>
                        ✗ Failed
                      </span>
                    )}
                  </td>
                  <td>
                    {detail.status === "sent" && detail.previewUrl ? (
                      <a
                        href={detail.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Preview email
                      </a>
                    ) : (
                      <span style={{ color: "var(--danger)" }}>
                        {detail.errorMessage || "Unknown error"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

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
