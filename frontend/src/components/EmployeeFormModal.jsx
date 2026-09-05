import { useState, useEffect } from 'react';
import apiClient from '../api/client';

const EMPTY_FORM = {
  name: '',
  workEmail: '',
  phone: '',
  departmentId: '',
  managerId: '',
  jobPosition: '',
  status: 'active',
  employeeType: 'full_time',
};

export default function EmployeeFormModal({ employee, departments, employees, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(employee);

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name || '',
        workEmail: employee.workEmail || '',
        phone: employee.phone || '',
        departmentId: employee.departmentId || '',
        managerId: employee.managerId || '',
        jobPosition: employee.jobPosition || '',
        status: employee.status || 'active',
        employeeType: employee.employeeType || 'full_time',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [employee]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const payload = {
      ...form,
      departmentId: form.departmentId || null,
      managerId: form.managerId || null,
    };

    try {
      if (isEditing) {
        await apiClient.put(`/employees/${employee.id}`, payload);
      } else {
        await apiClient.post('/employees', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save employee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{isEditing ? `Edit / ${employee.name}` : 'Create Employee'}</h3>

        <form onSubmit={handleSubmit}>
          <label>Full Name *</label>
          <input value={form.name} onChange={handleChange('name')} required />

          <label>Work Email *</label>
          <input type="email" value={form.workEmail} onChange={handleChange('workEmail')} required />

          <label>Phone</label>
          <input value={form.phone} onChange={handleChange('phone')} />

          <label>Department</label>
          <select value={form.departmentId} onChange={handleChange('departmentId')}>
            <option value="">-- None --</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <label>Manager</label>
          <select value={form.managerId} onChange={handleChange('managerId')}>
            <option value="">-- None --</option>
            {employees
              .filter((e) => !employee || e.id !== employee.id)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>

          <label>Job Position</label>
          <input value={form.jobPosition} onChange={handleChange('jobPosition')} />

          <label>Employee Type</label>
          <select value={form.employeeType} onChange={handleChange('employeeType')}>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
          </select>

          <label>Status</label>
          <select value={form.status} onChange={handleChange('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
