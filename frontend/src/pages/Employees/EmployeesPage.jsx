import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Plus, Users as UsersIcon } from 'lucide-react';
import client from '../../api/client';
import EmployeeFormModal from './EmployeeFormModal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Pagination from '../../components/ui/Pagination.jsx';

const PAGE_SIZE = 15;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'kanban'
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  // Server-side pagination — the backend only ever ships one page (15
  // records by default) at a time; requesting page 2, 3, ... asks it for
  // the next slice rather than loading the whole workforce up front.
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });

  const load = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const { data } = await client.get('/employees', { params: { page: targetPage, limit: PAGE_SIZE } });
      setEmployees(data.data);
      setPagination(data.pagination);
      setPage(data.pagination.page);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === page) return;
    load(nextPage);
  };

  // Mutations (create/edit/delete) refresh whichever page we're currently on,
  // except delete, which can leave the current page empty — in that case
  // step back a page instead of showing a blank table.
  const reloadCurrentPage = () => load(page);

  const openCreate = () => { setEditingEmployee(null); setShowForm(true); };
  const openEdit = (emp) => { setEditingEmployee(emp); setShowForm(true); };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    try {
      await client.delete(`/employees/${emp.id}`);
      // If that was the last record on this page, drop back a page so we
      // never render an empty page while later pages still have records.
      const isLastRowOnPage = employees.length === 1 && page > 1;
      load(isLastRowOnPage ? page - 1 : page);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete employee');
    }
  };

  const grouped = employees.reduce((acc, e) => {
    const key = e.department?.name || 'Unassigned';
    acc[key] = acc[key] || [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Workforce</div>
          <h1>Employees</h1>
          <div className="page-subtitle">
            {loading
              ? 'Loading…'
              : pagination.total === 0
                ? '0 total employees'
                : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} employees`}
          </div>
        </div>
        <div className="page-header-actions">
          <div className="view-toggle">
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List</button>
            <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>Kanban</button>
          </div>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Employee</button>
        </div>
      </div>

      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}

      {loading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No employees yet"
          description="Add your first employee to start building out your workforce records."
          action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Employee</button>}
        />
      ) : view === 'list' ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Department</th><th>Job Position</th><th>Manager</th>
              <th>Schedule</th><th>Status</th><th>Contracts</th><th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td><Link to={`/employees/${emp.id}`}>{emp.name}</Link></td>
                <td>{emp.department?.name || '—'}</td>
                <td>{emp.jobPosition || '—'}</td>
                <td>{emp.manager?.name || '—'}</td>
                <td>{emp.schedule?.name || '—'}</td>
                <td><StatusBadge status={emp.status} /></td>
                <td>{emp._count?.contracts ?? 0}</td>
                <td className="row-actions">
                  <button className="btn btn-small btn-secondary" onClick={() => openEdit(emp)}>Edit</button>
                  <button className="btn btn-small btn-danger" onClick={() => handleDelete(emp)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="kanban-board">
          {Object.entries(grouped).map(([deptName, emps]) => (
            <div className="kanban-column" key={deptName}>
              <h3>{deptName} ({emps.length})</h3>
              {emps.map((emp) => (
                <div className="kanban-card" key={emp.id} onClick={() => openEdit(emp)}>
                  <div className="kanban-card-name">{emp.name}</div>
                  <div className="kanban-card-sub">{emp.jobPosition || '—'}</div>
                  <StatusBadge status={emp.status} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!loading && employees.length > 0 && (
        <Pagination page={page} totalPages={pagination.totalPages} onPageChange={goToPage} />
      )}

      {showForm && (
        <EmployeeFormModal
          employee={editingEmployee}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reloadCurrentPage(); }}
        />
      )}
    </div>
  );
}
