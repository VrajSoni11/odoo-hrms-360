import { useEffect, useState } from "react";
import {
  createAllocation,
  approveAllocation,
  getAllocations,
  getTimeOffTypes,
} from "../../api/timeoff.api";
import { getEmployees } from "../../api/employees.api";
import StatusBadge from "../../components/ui/StatusBadge.jsx";

export default function TimeOffAllocations() {
  const [allocations, setAllocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    employeeId: "",
    timeOffTypeId: "",
    allocatedAmount: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    getAllocations()
      .then(({ data }) => setAllocations(Array.isArray(data) ? data : []))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load allocations"),
      )
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    getEmployees().then(({ data }) => setEmployees(data));
    getTimeOffTypes().then(({ data }) => setTypes(data));
  }, []);
  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await createAllocation(form);
      setForm({ employeeId: "", timeOffTypeId: "", allocatedAmount: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create allocation");
    }
  }
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Time Off</div>
          <h1>Time Off Allocations</h1>
        </div>
      </div>
      <form className="card" onSubmit={submit}>
        <label>
          Employee
          <select
            required
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          >
            <option value="">Select employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
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
          Amount
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.allocatedAmount}
            onChange={(e) =>
              setForm({ ...form, allocatedAmount: e.target.value })
            }
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary">Create Allocation</button>
      </form>
      {loading && <p>Loading allocations...</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Type</th>
            <th>Allocated</th>
            <th>Remaining</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {!loading && allocations.length === 0 && (
            <tr>
              <td colSpan="6">No allocations found.</td>
            </tr>
          )}
          {allocations.map((a) => (
            <tr key={a.id}>
              <td>{a.employee?.name}</td>
              <td>{a.timeOffType?.name}</td>
              <td>{String(a.allocatedAmount ?? 0)}</td>
              <td>{String(a.remainingAmount ?? 0)}</td>
              <td><StatusBadge status={a.status} /></td>
              <td className="row-actions">
                {a.status === "draft" && (
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => approveAllocation(a.id).then(load)}
                  >
                    Approve
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
