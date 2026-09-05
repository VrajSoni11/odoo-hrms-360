import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deletePayrun, getPayruns } from "../../api/payroll.api";
import { useAuth } from "../../context/AuthContext.jsx";

export default function PayrunsPage() {
  const { user } = useAuth();
  const canDelete = ["Admin", "HR Payroll Manager"].includes(user.role);
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState("");
  const load = () =>
    getPayruns()
      .then(({ data }) => setRuns(data))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load payruns"),
      );
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="page">
      <div className="page-header">
        <h1>Payruns</h1>
        <Link className="btn btn-primary" to="/payroll/payruns/new">
          New Payrun
        </Link>
      </div>
      {error && <div className="form-error">{error}</div>}
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
              <td>{run.status}</td>
              <td>{run._count?.payslips ?? 0}</td>
              <td>{run._count?.warnings ?? 0}</td>
              <td>
                {canDelete && run.status === "draft" && (
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => deletePayrun(run.id).then(load)}
                  >
                    Delete
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
