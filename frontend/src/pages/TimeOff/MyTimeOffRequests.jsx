import { useEffect, useState } from "react";
import {
  cancelTimeOffRequest,
  createTimeOffRequest,
  getTimeOffRequests,
  getTimeOffTypes,
} from "../../api/timeoff.api";

export default function MyTimeOffRequests() {
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    timeOffTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const load = () => getTimeOffRequests().then(({ data }) => setRequests(data));
  useEffect(() => {
    load();
    getTimeOffTypes().then(({ data }) => setTypes(data));
  }, []);
  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await createTimeOffRequest(form);
      setForm({
        timeOffTypeId: "",
        startDate: "",
        endDate: "",
        reason: "",
      });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not submit request");
    }
  }
  return (
    <div className="page">
      <div className="page-header">
        <h1>My Time Off Requests</h1>
      </div>
      <form className="card" onSubmit={submit}>
        <label>
          Type
          <select
            required
            value={form.timeOffTypeId}
            onChange={(e) =>
              setForm({ ...form, timeOffTypeId: e.target.value })
            }
          >
            <option value="">Select type</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Start date
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </label>
        <label>
          End date
          <input
            type="date"
            required
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </label>
        {form.startDate &&
          form.endDate &&
          new Date(`${form.endDate}T00:00:00`) >=
            new Date(`${form.startDate}T00:00:00`) && (
            <p>
              Duration:{" "}
              {Math.floor(
                (new Date(`${form.endDate}T00:00:00`) -
                  new Date(`${form.startDate}T00:00:00`)) /
                  86400000,
              ) + 1}{" "}
              day(s)
            </p>
          )}
        <label>
          Reason
          <input
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary">Submit Request</button>
      </form>
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Dates</th>
            <th>Amount</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>{r.timeOffType?.name}</td>
              <td>
                {String(r.startDate).slice(0, 10)} to{" "}
                {String(r.endDate).slice(0, 10)}
              </td>
              <td>{r.requestedAmount.toString()}</td>
              <td>{r.status}</td>
              <td>
                {["pending", "approved"].includes(r.status) && (
                  <button
                    className="btn btn-small"
                    onClick={() => cancelTimeOffRequest(r.id).then(load)}
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
