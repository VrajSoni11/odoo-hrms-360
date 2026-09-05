import React, { useEffect, useState, useCallback } from 'react';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', roleId: '', employeeId: '' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    client.get('/users').then((r) => setUsers(r.data));
    client.get('/users/roles').then((r) => setRoles(r.data));
    client.get('/users/unlinked-employees').then((r) => setUnlinkedEmployees(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/users', {
        ...form,
        roleId: Number(form.roleId),
        employeeId: form.employeeId ? Number(form.employeeId) : null,
      });
      setForm({ email: '', password: '', roleId: '', employeeId: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create user');
    }
  };

  const toggleActive = async (u) => {
    if (u.id === currentUser.id) {
      alert('You cannot deactivate your own account.');
      return;
    }
    try {
      await client.put(`/users/${u.id}`, { isActive: !u.isActive });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update user');
    }
  };

  const handleDelete = async (u) => {
    if (u.id === currentUser.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Delete login for ${u.email}?`)) return;
    try {
      await client.delete(`/users/${u.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete user');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>User Management</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleCreate}>
          <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label>Role
            <select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">— Select role —</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label>Link to Employee
            <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">— None —</option>
              {unlinkedEmployees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.workEmail})</option>)}
            </select>
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary" type="submit">Create User</button>
        </form>
      )}

      <table className="data-table">
        <thead><tr><th>Email</th><th>Role</th><th>Employee</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.role?.name}</td>
              <td>{u.employee?.name || '—'}</td>
              <td><span className={`badge badge-${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
              <td className="row-actions">
                <button className="btn btn-small" onClick={() => toggleActive(u)}>
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn btn-small btn-danger" onClick={() => handleDelete(u)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
