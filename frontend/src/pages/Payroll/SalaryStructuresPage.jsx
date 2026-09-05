import { useEffect, useState } from "react";
import {
  createSalaryStructure,
  deleteSalaryStructure,
  getSalaryStructures,
  updateSalaryStructure,
} from "../../api/salary.api";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { SkeletonTable } from "../../components/ui/Skeleton.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

const WRITE_ROLES = ["Admin", "HR Payroll Manager"];

export default function SalaryStructuresPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWrite = WRITE_ROLES.includes(user.role);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    getSalaryStructures()
      .then(({ data }) => setStructures(data))
      .catch((err) =>
        setError(
          err.response?.data?.error || "Could not load salary structures",
        ),
      )
      .finally(() => setLoading(false));
  };
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
    if (!window.confirm("Delete this salary structure?")) return;
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
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1>Salary Structures</h1>
          <div className="page-subtitle">{loading ? "Loading…" : `${structures.length} structure(s)`}</div>
        </div>
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
          {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
          <button className="btn btn-primary">
            {editing ? <><Pencil size={15} /> Save</> : <><Plus size={15} /> Create Structure</>}
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
              <X size={15} /> Cancel
            </button>
          )}
        </form>
      )}
      {!canWrite && error && <div className="form-error"><AlertCircle size={16} />{error}</div>}

      {loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : structures.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No salary structures yet"
          description={canWrite ? "Create a structure above, then add salary rules to it." : "Ask an HR Payroll Manager to set one up."}
        />
      ) : (
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
                  {user.role === "Admin" ? (
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() =>
                        navigate(`/payroll/salary-rules?structureId=${s.id}`)
                      }
                    >
                      {s.name}
                    </button>
                  ) : (
                    s.name
                  )}
                </td>
                <td>{s._count?.rules ?? 0}</td>
                <td>{s._count?.contracts ?? 0}</td>
                <td><StatusBadge status={s.isActive ? "active" : "inactive"} /></td>
                <td className="row-actions">
                  {canWrite && (
                    <>
                      <button className="btn btn-small btn-secondary" onClick={() => toggle(s)}>
                        {s.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => {
                          setEditing(s);
                          setName(s.name);
                        }}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => remove(s.id)}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
