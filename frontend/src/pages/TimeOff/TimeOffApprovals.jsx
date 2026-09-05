import { useEffect, useState } from "react";
import {
  approveTimeOffRequest,
  getTimeOffRequests,
  refuseTimeOffRequest,
} from "../../api/timeoff.api";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { SkeletonTable } from "../../components/ui/Skeleton.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { AlertCircle, CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";

export default function TimeOffApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    getTimeOffRequests()
      .then(({ data }) => setRequests(Array.isArray(data) ? data : []))
      .catch((err) =>
        setError(
          err.response?.data?.error || "Could not load time-off requests",
        ),
      )
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  async function act(action, id) {
    await action(id);
    load();
  }
  const pending = requests.filter((r) => r.status === "pending");
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Time Off</div>
          <h1>Time Off Approvals</h1>
          <div className="page-subtitle">
            {loading ? "Loading…" : `${pending.length} pending request(s)`}
          </div>
        </div>
      </div>

      {error && (
        <div className="form-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : pending.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No pending requests"
          description="You're all caught up — new requests will show up here."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Amount</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pending.map((r) => (
              <tr key={r.id}>
                <td>{r.employee?.name}</td>
                <td>{r.timeOffType?.name}</td>
                <td>
                  {String(r.startDate).slice(0, 10)} to{" "}
                  {String(r.endDate).slice(0, 10)}
                </td>
                <td>{String(r.requestedAmount ?? 0)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="row-actions">
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => act(approveTimeOffRequest, r.id)}
                  >
                    <CheckCircle2 size={13} /> Approve
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => act(refuseTimeOffRequest, r.id)}
                  >
                    <XCircle size={13} /> Refuse
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
