import React, { useEffect, useState, useCallback } from 'react';
import client from '../../api/client';
import ScheduleFormModal from './ScheduleFormModal.jsx';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    client.get('/schedules').then((r) => setSchedules(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingSchedule(null); setShowForm(true); };
  const openEdit = (s) => { setEditingSchedule(s); setShowForm(true); };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete schedule "${s.name}"?`)) return;
    try {
      await client.delete(`/schedules/${s.id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete schedule');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Working Schedules</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Schedule</button>
      </div>
      {error && <div className="form-error">{error}</div>}

      <table className="data-table">
        <thead><tr><th>Name</th><th>Type</th><th>Weekly Hours</th><th>Employees</th><th>Contracts</th><th></th></tr></thead>
        <tbody>
          {schedules.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.type}</td>
              <td>{Number(s.totalWeeklyHours).toFixed(2)}h</td>
              <td>{s._count?.employees ?? 0}</td>
              <td>{s._count?.contracts ?? 0}</td>
              <td className="row-actions">
                <button className="btn btn-small" onClick={() => openEdit(s)}>Edit</button>
                <button className="btn btn-small btn-danger" onClick={() => handleDelete(s)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <ScheduleFormModal
          schedule={editingSchedule}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
