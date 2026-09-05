import { useEffect, useState } from "react";
import {
  createTimeOffType,
  deleteTimeOffType,
  getTimeOffTypes,
} from "../../api/timeoff.api";

export default function TimeOffTypes() {
  const [types, setTypes] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    getTimeOffTypes()
      .then(({ data }) => setTypes(Array.isArray(data) ? data : []))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load time-off types"),
      )
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await createTimeOffType({ name });
      setName("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create type");
    }
  }
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Time Off</div>
          <h1>Time Off Types</h1>
        </div>
      </div>
      <form className="card" onSubmit={submit}>
        <label>
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary">Add Type</button>
      </form>
      {loading && <p>Loading time-off types...</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Unit</th>
            <th>Allocation</th>
            <th>Approval</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {!loading && types.length === 0 && (
            <tr>
              <td colSpan="5">No time-off types found.</td>
            </tr>
          )}
          {types.map((type) => (
            <tr key={type.id}>
              <td>{type.name}</td>
              <td>{type.unit}</td>
              <td>{type.requiresAllocation ? "Required" : "Not required"}</td>
              <td>{type.requiresApproval ? "Required" : "Not required"}</td>
              <td>
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => deleteTimeOffType(type.id).then(load)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
