import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import EmployeeFormModal from '../components/EmployeeFormModal';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.get('/employees', { params: { search: search || undefined } });
    setEmployees(res.data);
    setLoading(false);
  }, [search]);

  const loadDepartments = useCallback(async () => {
    const res = await apiClient.get('/departments');
    setDepartments(res.data);
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    const timeout = setTimeout(loadEmployees, 250); // light debounce on search
    return () => clearTimeout(timeout);
  }, [loadEmployees]);

  const openCreate = () => {
    setEditingEmployee(null);
    setModalOpen(true);
  };

  const openEdit = (employee) => {
    setEditingEmployee(employee);
    setModalOpen(true);
  };

  const handleDelete = async (employee) => {
    if (!window.confirm(`Delete ${employee.name}? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/employees/${employee.id}`);
      loadEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete employee');
    }
  };

  const handleSaved = () => {
    setModalOpen(false);
    loadEmployees();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Employees</h2>
          <p className="page-subtitle">Default view: employee records</p>
        </div>
        <button onClick={openCreate}>+ New Employee</button>
      </div>

      <div className="toolbar">
        <input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="view-toggle">
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
          <button
            className={viewMode === 'kanban' ? 'active' : ''}
            onClick={() => setViewMode('kanban')}
          >
            Kanban
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : viewMode === 'list' ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Work Email</th>
              <th>Job Position</th>
              <th>Department</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.name}</td>
                <td>{emp.workEmail}</td>
                <td>{emp.jobPosition || '—'}</td>
                <td>{emp.department?.name || '—'}</td>
                <td>
                  <span className={`badge badge-${emp.status}`}>{emp.status}</span>
                </td>
                <td className="row-actions">
                  <button className="btn-link" onClick={() => openEdit(emp)}>
                    Edit
                  </button>
                  <button className="btn-link btn-danger" onClick={() => handleDelete(emp)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <div className="kanban-board">
          {employees.map((emp) => (
            <div key={emp.id} className="kanban-card" onClick={() => openEdit(emp)}>
              <div className="kanban-card-name">{emp.name}</div>
              <div className="kanban-card-role">{emp.jobPosition || '—'}</div>
              <span className={`badge badge-${emp.status}`}>{emp.status}</span>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <EmployeeFormModal
          employee={editingEmployee}
          departments={departments}
          employees={employees}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
