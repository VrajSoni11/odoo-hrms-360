import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const loadDepartments = useCallback(async () => {
    const res = await apiClient.get('/departments');
    setDepartments(res.data);
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;

    try {
      if (editingId) {
        await apiClient.put(`/departments/${editingId}`, { name });
      } else {
        await apiClient.post('/departments', { name });
      }
      setName('');
      setEditingId(null);
      loadDepartments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save department');
    }
  };

  const handleEdit = (dept) => {
    setEditingId(dept.id);
    setName(dept.name);
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return;
    try {
      await apiClient.delete(`/departments/${dept.id}`);
      loadDepartments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete department');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Departments</h2>
      </div>

      <form className="inline-form" onSubmit={handleSubmit}>
        <input
          placeholder="Department name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">{editingId ? 'Save' : '+ New Department'}</button>
        {editingId && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setEditingId(null);
              setName('');
            }}
          >
            Cancel
          </button>
        )}
      </form>

      {error && <div className="form-error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Employees</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id}>
              <td>{dept.name}</td>
              <td>{dept._count?.employees ?? 0}</td>
              <td className="row-actions">
                <button className="btn-link" onClick={() => handleEdit(dept)}>
                  Edit
                </button>
                <button className="btn-link btn-danger" onClick={() => handleDelete(dept)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {departments.length === 0 && (
            <tr>
              <td colSpan={3} className="empty-state">
                No departments yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
