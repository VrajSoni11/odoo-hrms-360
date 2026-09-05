import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Plus, Trash2, Wallet } from "lucide-react";
import { deletePayrun, getPayruns } from "../../api/payroll.api";
import { useAuth } from "../../context/AuthContext.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { SkeletonTable } from "../../components/ui/Skeleton.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

export default function PayrunsPage() {
  const { user } = useAuth();
  const canDelete = ["Admin", "HR Payroll Manager"].includes(user.role);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    getPayruns()
      .then(({ data }) => setRuns(data))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load payruns"),
      )
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1>Payruns</h1>
          <div className="page-subtitle">{loading ? "Loading…" : `${runs.length} payrun(s)`}</div>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-primary" to="/payroll/payruns/new">
            <Plus size={15} /> New Payrun
          </Link>
        </div>
      </div>
      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}

      {loading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payruns yet"
          description="Start a new payrun to compute and pay employee salaries for a period."
          action={<Link className="btn btn-primary" to="/payroll/payruns/new"><Plus size={15} /> New Payrun</Link>}
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Period</th>
              <th>Structure</th>
              <th>Status</th>
              <th>Payslips</th>
              <th>Warnings</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>
                  <Link to={`/payroll/payruns/${run.id}`}>{run.name}</Link>
                </td>
                <td>
                  {String(run.periodStart).slice(0, 10)} to{" "}
                  {String(run.periodEnd).slice(0, 10)}
                </td>
                <td>{run.salaryStructure?.name}</td>
                <td><StatusBadge status={run.status} /></td>
                <td>{run._count?.payslips ?? 0}</td>
                <td>{run._count?.warnings ?? 0}</td>
                <td className="row-actions">
                  {canDelete && run.status === "draft" && (
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => deletePayrun(run.id).then(load)}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
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
