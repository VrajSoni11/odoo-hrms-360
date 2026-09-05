import React, { useEffect, useState, useCallback } from 'react';
import client from '../../api/client';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    client.get('/departments').then((r) => setDepartments(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      await client.post('/departments', { name });
      setName('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create department');
    }
  };

  const startEdit = (d) => { setEditingId(d.id); setEditingName(d.name); };

  const saveEdit = async (id) => {
    try {
      await client.put(`/departments/${id}`, { name: editingName });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update department');
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete department "${d.name}"?`)) return;
    try {
      await client.delete(`/departments/${d.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete department');
    }
  };

  return (
    <div className="page">
      <h1>Departments</h1>

      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="New department name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" type="submit">+ Add</button>
      </form>
      {error && <div className="form-error">{error}</div>}

      <table className="data-table">
        <thead><tr><th>Name</th><th>Employees</th><th></th></tr></thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.id}>
              <td>
                {editingId === d.id ? (
                  <input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                ) : d.name}
              </td>
              <td>{d._count?.employees ?? 0}</td>
              <td className="row-actions">
                {editingId === d.id ? (
                  <>
                    <button className="btn btn-small btn-primary" onClick={() => saveEdit(d.id)}>Save</button>
                    <button className="btn btn-small btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-small" onClick={() => startEdit(d)}>Edit</button>
                    <button className="btn btn-small btn-danger" onClick={() => handleDelete(d)}>Delete</button>
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
