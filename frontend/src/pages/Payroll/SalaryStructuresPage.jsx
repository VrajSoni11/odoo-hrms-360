import { useEffect, useState } from "react";
import {
  createSalaryStructure,
  deleteSalaryStructure,
  getSalaryStructures,
  updateSalaryStructure,
} from "../../api/salary.api";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

const WRITE_ROLES = ["Admin", "HR Payroll Manager"];

export default function SalaryStructuresPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWrite = WRITE_ROLES.includes(user.role);
  const [structures, setStructures] = useState([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const load = () =>
    getSalaryStructures()
      .then(({ data }) => setStructures(data))
      .catch((err) =>
        setError(
          err.response?.data?.error || "Could not load salary structures",
        ),
      );
  useEffect(() => {
    load();
  }, []);
  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      if (editing)
        await updateSalaryStructure(editing.id, {
          name,
          isActive: editing.isActive,
        });
      else await createSalaryStructure({ name });
      setName("");
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save salary structure");
    }
  }
  async function remove(id) {
    try {
      await deleteSalaryStructure(id);
      load();
    } catch (err) {
      setError(
        err.response?.data?.error || "Could not delete salary structure",
      );
    }
  }
  async function toggle(structure) {
    try {
      await updateSalaryStructure(structure.id, {
        name: structure.name,
        isActive: !structure.isActive,
      });
      load();
    } catch (err) {
      setError(
        err.response?.data?.error || "Could not update salary structure",
      );
    }
  }
  return (
    <div className="page">
      <div className="page-header">
        <h1>Salary Structures</h1>
      </div>
      {canWrite && (
        <form className="card" onSubmit={save}>
          <label>
            {editing ? "Edit name" : "New structure"}
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary">
            {editing ? "Save" : "Create Structure"}
          </button>
          {editing && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditing(null);
                setName("");
              }}
            >
              Cancel
            </button>
          )}
        </form>
      )}
      {!canWrite && error && <div className="form-error">{error}</div>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Rules</th>
            <th>Contracts</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {structures.map((s) => (
            <tr key={s.id}>
              <td>
                <button
                  className="btn btn-small"
                  onClick={() =>
                    navigate(`/payroll/salary-rules?structureId=${s.id}`)
                  }
                >
                  {s.name}
                </button>
              </td>
              <td>{s._count?.rules ?? 0}</td>
              <td>{s._count?.contracts ?? 0}</td>
              <td>{s.isActive ? "Active" : "Inactive"}</td>
              <td>
                {canWrite && (
                  <>
                    <button className="btn btn-small" onClick={() => toggle(s)}>
                      {s.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={() => {
                        setEditing(s);
                        setName(s.name);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => remove(s.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
