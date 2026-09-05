import { useEffect, useState } from "react";
import {
  approveTimeOffRequest,
  getTimeOffRequests,
  refuseTimeOffRequest,
} from "../../api/timeoff.api";

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
  return (
    <div className="page">
      <div className="page-header">
        <h1>Time Off Approvals</h1>
      </div>
      {error && <div className="form-error">{error}</div>}
      {loading && <p>Loading requests...</p>}
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
          {!loading &&
            requests.filter((r) => r.status === "pending").length === 0 && (
              <tr>
                <td colSpan="6">No pending requests.</td>
              </tr>
            )}
          {requests
            .filter((r) => r.status === "pending")
            .map((r) => (
              <tr key={r.id}>
                <td>{r.employee?.name}</td>
                <td>{r.timeOffType?.name}</td>
                <td>
                  {String(r.startDate).slice(0, 10)} to{" "}
                  {String(r.endDate).slice(0, 10)}
                </td>
                <td>{String(r.requestedAmount ?? 0)}</td>
                <td>{r.status}</td>
                <td>
                  <button
                    className="btn btn-small"
                    onClick={() => act(approveTimeOffRequest, r.id)}
                  >
                    Approve
                  </button>{" "}
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => act(refuseTimeOffRequest, r.id)}
                  >
                    Refuse
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
