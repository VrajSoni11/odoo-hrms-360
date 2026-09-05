import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Building2, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import client from '../../api/client';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    client.get('/departments')
      .then((r) => setDepartments(r.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load departments'))
      .finally(() => setLoading(false));
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
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Workforce</div>
          <h1>Departments</h1>
          <div className="page-subtitle">{loading ? 'Loading…' : `${departments.length} department(s)`}</div>
        </div>
      </div>

      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="New department name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" type="submit"><Plus size={15} /> Add</button>
      </form>
      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}

      {loading ? (
        <SkeletonTable rows={5} columns={3} />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description="Add a department above to start organizing your workforce."
        />
      ) : (
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
                      <button className="btn btn-small btn-primary" onClick={() => saveEdit(d.id)}><Check size={13} /> Save</button>
                      <button className="btn btn-small btn-ghost" onClick={() => setEditingId(null)}><X size={13} /> Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-small btn-secondary" onClick={() => startEdit(d)}><Pencil size={13} /> Edit</button>
                      <button className="btn btn-small btn-danger" onClick={() => handleDelete(d)}><Trash2 size={13} /> Delete</button>
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
