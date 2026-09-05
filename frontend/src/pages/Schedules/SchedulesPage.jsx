import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react';
import client from '../../api/client';
import ScheduleFormModal from './ScheduleFormModal.jsx';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    client.get('/schedules')
      .then((r) => setSchedules(r.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load schedules'))
      .finally(() => setLoading(false));
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
        <div>
          <div className="page-eyebrow">Workforce</div>
          <h1>Working Schedules</h1>
          <div className="page-subtitle">{loading ? 'Loading…' : `${schedules.length} schedule(s)`}</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Schedule</button>
        </div>
      </div>
      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}

      {loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No working schedules yet"
          description="Create a schedule to define weekly working hours for employees and contracts."
          action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Schedule</button>}
        />
      ) : (
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
                  <button className="btn btn-small btn-secondary" onClick={() => openEdit(s)}><Pencil size={13} /> Edit</button>
                  <button className="btn btn-small btn-danger" onClick={() => handleDelete(s)}><Trash2 size={13} /> Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
