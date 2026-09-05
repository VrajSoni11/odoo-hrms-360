import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Calculator,
  CheckCircle2,
  FileText,
  Send,
} from "lucide-react";
import {
  computePayrun,
  getPayrun,
  markPayrunPaid,
  resolveWarning,
  sendPayslips,
  validatePayrun,
} from "../../api/payroll.api";
import { useAuth } from "../../context/AuthContext.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

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
  if (error && !run)
    return (
      <div className="page">
        <div className="form-error"><AlertCircle size={16} />{error}</div>
      </div>
    );
  if (!run) return <div className="page page-loading">Loading payrun…</div>;
  const canSend = ["validated", "paid"].includes(run.status);
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1>{run.name}</h1>
          <div className="page-subtitle">
            {run.salaryStructure?.name} | {String(run.periodStart).slice(0, 10)} to{" "}
            {String(run.periodEnd).slice(0, 10)}
          </div>
        </div>
        <div className="page-header-actions">
          <StatusBadge status={run.status} />
        </div>
      </div>
      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
      <div className="page-header-actions" style={{ marginBottom: 20 }}>
        <button
          className="btn btn-primary"
          disabled={run.status !== "draft"}
          onClick={() => action(computePayrun)}
        >
          <Calculator size={15} /> Compute
        </button>
        <button
          className="btn btn-primary"
          disabled={run.status !== "computed"}
          onClick={() => action(validatePayrun)}
        >
          <CheckCircle2 size={15} /> Validate
        </button>
        <button
          className="btn btn-primary"
          disabled={!manager || run.status !== "validated"}
          onClick={() => action(markPayrunPaid)}
        >
          <Banknote size={15} /> Mark Paid
        </button>
        <button
          className="btn btn-primary"
          disabled={!canSend || sending}
          onClick={handleSendPayslips}
        >
          <Send size={15} /> {sending ? "Sending…" : "Send Payslips"}
        </button>
      </div>

      {sendResult && (
        <section style={{ marginBottom: 24 }}>
          <div className="page-header">
            <div className="section-title" style={{ marginBottom: 0 }}>Email Delivery Results</div>
            <span className="page-subtitle" style={{ marginTop: 0 }}>
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
                      <span className="badge badge-active">Sent</span>
                    ) : (
                      <span className="badge badge-rejected">Failed</span>
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

      <div className="section-title">Warnings</div>
      {run.warnings?.length ? (
        <table className="data-table" style={{ marginBottom: 24 }}>
          <tbody>
            {run.warnings.map((warning) => (
              <tr key={warning.id}>
                <td><StatusBadge status={warning.severity} /></td>
                <td>{warning.message}</td>
                <td className="row-actions">
                  {!warning.resolved && manager && (
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => resolveWarning(id, warning.id).then(load)}
                    >
                      <CheckCircle2 size={13} /> Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState icon={AlertTriangle} title="No warnings" description="This payrun has no outstanding warnings." />
      )}

      <div className="section-title" style={{ marginTop: 4 }}>Payslips</div>
      {run.payslips?.length ? (
        <table className="data-table">
          <tbody>
            {run.payslips.map((slip) => (
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
      ) : (
        <EmptyState icon={FileText} title="No payslips yet" description="Compute this payrun to generate payslips." />
      )}
    </div>
  );
}
