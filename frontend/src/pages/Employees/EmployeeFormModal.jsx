import React, { useEffect, useState } from 'react';
import client from '../../api/client';

export default function EmployeeFormModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', workEmail: '', phone: '', departmentId: '', managerId: '',
    jobPosition: '', status: 'active', employeeType: 'full_time', scheduleId: '',
  });
  const [departments, setDepartments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client.get('/departments').then((r) => setDepartments(r.data));
    client.get('/schedules').then((r) => setSchedules(r.data));
    client.get('/employees').then((r) => setManagers(r.data));
  }, []);

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
        scheduleId: employee.scheduleId || '',
      });
    }
  }, [employee]);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      departmentId: form.departmentId || null,
      managerId: form.managerId || null,
      scheduleId: form.scheduleId || null,
    };
    try {
      if (employee) {
        await client.put(`/employees/${employee.id}`, payload);
      } else {
        await client.post('/employees', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{employee ? 'Edit Employee' : 'New Employee'}</h2>
        <form onSubmit={handleSubmit}>
          <label>Name<input value={form.name} onChange={handleChange('name')} required /></label>
          <label>Work Email<input type="email" value={form.workEmail} onChange={handleChange('workEmail')} required /></label>
          <label>Phone<input value={form.phone} onChange={handleChange('phone')} /></label>

          <label>Department
            <select value={form.departmentId} onChange={handleChange('departmentId')}>
              <option value="">— None —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>

          <label>Manager
            <select value={form.managerId} onChange={handleChange('managerId')}>
              <option value="">— None —</option>
              {managers.filter((m) => m.id !== employee?.id).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>

          <label>Job Position<input value={form.jobPosition} onChange={handleChange('jobPosition')} /></label>

          <label>Working Schedule
            <select value={form.scheduleId} onChange={handleChange('scheduleId')}>
              <option value="">— None —</option>
              {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <label>Employee Type
            <select value={form.employeeType} onChange={handleChange('employeeType')}>
              <option value="full_time">Full-Time</option>
              <option value="part_time">Part-Time</option>
              <option value="contract">Contract</option>
            </select>
          </label>

          <label>Status
            <select value={form.status} onChange={handleChange('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
