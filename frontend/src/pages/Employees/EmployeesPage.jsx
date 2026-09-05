import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Plus, Users as UsersIcon } from 'lucide-react';
import client from '../../api/client';
import EmployeeFormModal from './EmployeeFormModal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'kanban'
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/employees');
      setEmployees(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingEmployee(null); setShowForm(true); };
  const openEdit = (emp) => { setEditingEmployee(emp); setShowForm(true); };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    try {
      await client.delete(`/employees/${emp.id}`);
      load();
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
          <div className="page-subtitle">{loading ? 'Loading…' : `${employees.length} total employees`}</div>
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

      {showForm && (
        <EmployeeFormModal
          employee={editingEmployee}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
