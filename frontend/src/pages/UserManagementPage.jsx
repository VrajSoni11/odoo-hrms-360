import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { employeeId: '', email: '', password: '', roleId: '' };

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    const res = await apiClient.get('/users', {
      params: { search: search || undefined, roleId: roleFilter || undefined },
    });
    setUsers(res.data);
  }, [search, roleFilter]);

  const loadRoles = useCallback(async () => {
    const res = await apiClient.get('/users/roles');
    setRoles(res.data);
  }, []);

  const loadUnlinkedEmployees = useCallback(async () => {
    const res = await apiClient.get('/employees-unlinked');
    setUnlinkedEmployees(res.data);
  }, []);

  useEffect(() => {
    loadRoles();
    loadUnlinkedEmployees();
  }, [loadRoles, loadUnlinkedEmployees]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleFormChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    const employee = unlinkedEmployees.find((emp) => String(emp.id) === employeeId);
    setForm((prev) => ({
      ...prev,
      employeeId,
      email: employee ? employee.workEmail : '',
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiClient.post('/users', form);
      setForm(EMPTY_FORM);
      loadUsers();
      loadUnlinkedEmployees();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setForm(EMPTY_FORM);
    setError('');
  };

  const handleRoleChange = async (newRoleId) => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser.id) {
      alert('You cannot change your own role. Ask another Admin to do this.');
      return;
    }
    try {
      await apiClient.put(`/users/${selectedUser.id}`, { roleId: newRoleId });
      loadUsers();
      setSelectedUser((prev) => ({ ...prev, role: roles.find((r) => String(r.id) === newRoleId) }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleToggleActive = async (u) => {
    if (u.id === currentUser.id) {
      alert('You cannot deactivate your own account.');
      return;
    }
    try {
      await apiClient.put(`/users/${u.id}`, { isActive: !u.isActive });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>User Management <span className="admin-only-tag">Admin only</span></h2>
      </div>

      <div className="two-column-layout">
        <div className="column-main">
          <div className="toolbar">
            <input
              placeholder="Search users, employees or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Role Filter: All</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Employee</th>
                <th>Work Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={selectedUser?.id === u.id ? 'row-selected' : ''}
                  onClick={() => handleSelectUser(u)}
                >
                  <td>{u.employee?.name || u.email}</td>
                  <td>{u.employee?.name || '—'}</td>
                  <td>{u.email}</td>
                  <td>{u.role.name}</td>
                  <td>
                    <button
                      className={`badge-btn badge-${u.isActive ? 'active' : 'inactive'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(u);
                      }}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="hint-text">
            User accounts are separate from employee records but should be linked to an
            employee for access and ownership. Select a user to edit their role, or use the
            panel to create a new one.
          </p>
        </div>

        <div className="column-side">
          {selectedUser ? (
            <div className="side-panel">
              <h3>Edit User</h3>
              <p><strong>{selectedUser.employee?.name || selectedUser.email}</strong></p>
              <p className="muted">{selectedUser.email}</p>

              <label>Role</label>
              <div className="radio-group">
                {roles.map((r) => (
                  <label key={r.id} className="radio-option">
                    <input
                      type="radio"
                      name="role"
                      checked={selectedUser.role.id === r.id}
                      onChange={() => handleRoleChange(String(r.id))}
                      disabled={selectedUser.id === currentUser.id}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
              {selectedUser.id === currentUser.id && (
                <p className="form-hint">
                  You cannot change your own role or status. Ask another Admin.
                </p>
              )}
              <button className="btn-secondary" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
          ) : (
            <div className="side-panel">
              <h3>Create / Edit User</h3>
              <form onSubmit={handleCreate}>
                <label>Employee *</label>
                <select value={form.employeeId} onChange={handleEmployeeSelect} required>
                  <option value="">Select employee...</option>
                  {unlinkedEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.jobPosition || 'No title'})
                    </option>
                  ))}
                </select>

                <label>Work Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleFormChange('email')}
                  required
                />

                <label>Temporary Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={handleFormChange('password')}
                  required
                  minLength={6}
                />

                <label>Role *</label>
                <div className="radio-group">
                  {roles.map((r) => (
                    <label key={r.id} className="radio-option">
                      <input
                        type="radio"
                        name="newRole"
                        value={r.id}
                        checked={String(form.roleId) === String(r.id)}
                        onChange={handleFormChange('roleId')}
                        required
                      />
                      {r.name}
                    </label>
                  ))}
                </div>

                {error && <div className="form-error">{error}</div>}

                <button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create User / Grant Access'}
                </button>
              </form>
              {unlinkedEmployees.length === 0 && (
                <p className="hint-text">
                  Every employee already has a linked user account. Create a new employee
                  first (Employees page) before granting them login access.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
