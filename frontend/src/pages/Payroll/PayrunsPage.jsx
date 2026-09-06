import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Plus, Trash2, Wallet } from "lucide-react";
import { deletePayrun, getPayruns } from "../../api/payroll.api";
import { useAuth } from "../../context/AuthContext.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { SkeletonTable } from "../../components/ui/Skeleton.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Pagination from "../../components/ui/Pagination.jsx";

const PAGE_SIZE = 15;

export default function PayrunsPage() {
  const { user } = useAuth();
  const canDelete = ["Admin", "HR Payroll Manager"].includes(user.role);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Server-side pagination — the backend only ever ships one page (15
  // records by default) at a time.
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });

  const load = useCallback((targetPage = 1) => {
    setLoading(true);
    getPayruns({ page: targetPage, limit: PAGE_SIZE })
      .then(({ data }) => {
        setRuns(data.data);
        setPagination(data.pagination);
        setPage(data.pagination.page);
      })
      .catch((err) => setError(err.response?.data?.error || "Could not load payruns"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === page) return;
    load(nextPage);
  };

  const handleDelete = (run) => {
    deletePayrun(run.id).then(() => {
      // If that was the last row on this page, drop back a page so we
      // never render an empty page while later pages still have records.
      const isLastRowOnPage = runs.length === 1 && page > 1;
      load(isLastRowOnPage ? page - 1 : page);
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1>Payruns</h1>
          <div className="page-subtitle">
            {loading
              ? "Loading…"
              : pagination.total === 0
                ? "0 payrun(s)"
                : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} payrun(s)`}
          </div>
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
                      onClick={() => handleDelete(run)}
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

      {!loading && runs.length > 0 && (
        <Pagination page={page} totalPages={pagination.totalPages} onPageChange={goToPage} />
      )}
    </div>
  );
}
