import React, { useEffect, useState } from 'react';
import client from '../../api/client';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function emptyLines() {
  // Mon-Fri enabled by default, weekend off — matches a typical starting point
  return DAYS.map((_, i) => ({
    dayOfWeek: i,
    enabled: i < 5,
    startTime: '09:00',
    endTime: '17:00',
    breakMinutes: 60,
  }));
}

function previewTotalHours(lines) {
  let totalMinutes = 0;
  for (const l of lines) {
    if (!l.enabled) continue;
    const [sh, sm] = l.startTime.split(':').map(Number);
    const [eh, em] = l.endTime.split(':').map(Number);
    const worked = Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - (l.breakMinutes || 0));
    totalMinutes += worked;
  }
  return Math.round((totalMinutes / 60) * 100) / 100;
}

export default function ScheduleFormModal({ schedule, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('full_time');
  const [lines, setLines] = useState(emptyLines());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (schedule) {
      setName(schedule.name);
      setType(schedule.type);
      const byDay = {};
      (schedule.lines || []).forEach((l) => { byDay[l.dayOfWeek] = l; });
      setLines(DAYS.map((_, i) => byDay[i]
        ? { dayOfWeek: i, enabled: true, startTime: byDay[i].startTime, endTime: byDay[i].endTime, breakMinutes: byDay[i].breakMinutes }
        : { dayOfWeek: i, enabled: false, startTime: '09:00', endTime: '17:00', breakMinutes: 0 }
      ));
    }
  }, [schedule]);

  const updateLine = (i, field, value) => {
    const next = [...lines];
    next[i] = { ...next[i], [field]: value };
    setLines(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const activeLines = lines.filter((l) => l.enabled);
    if (activeLines.length === 0) {
      setError('Enable at least one working day.');
      return;
    }
    setSaving(true);
    const payload = {
      name,
      type,
      lines: activeLines.map(({ dayOfWeek, startTime, endTime, breakMinutes }) => ({
        dayOfWeek, startTime, endTime, breakMinutes: Number(breakMinutes) || 0,
      })),
    };
    try {
      if (schedule) {
        await client.put(`/schedules/${schedule.id}`, payload);
      } else {
        await client.post('/schedules', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>{schedule ? 'Edit Working Schedule' : 'New Working Schedule'}</h2>
        <form onSubmit={handleSubmit}>
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="full_time">Full-Time</option>
              <option value="part_time">Part-Time</option>
            </select>
          </label>

          <table className="schedule-grid">
            <thead>
              <tr><th></th><th>Day</th><th>Start</th><th>End</th><th>Break (min)</th></tr>
            </thead>
            <tbody>
              {DAYS.map((day, i) => (
                <tr key={day} className={lines[i].enabled ? '' : 'row-disabled'}>
                  <td><input type="checkbox" checked={lines[i].enabled} onChange={(e) => updateLine(i, 'enabled', e.target.checked)} /></td>
                  <td>{day}</td>
                  <td><input type="time" disabled={!lines[i].enabled} value={lines[i].startTime} onChange={(e) => updateLine(i, 'startTime', e.target.value)} /></td>
                  <td><input type="time" disabled={!lines[i].enabled} value={lines[i].endTime} onChange={(e) => updateLine(i, 'endTime', e.target.value)} /></td>
                  <td><input type="number" min="0" disabled={!lines[i].enabled} value={lines[i].breakMinutes} onChange={(e) => updateLine(i, 'breakMinutes', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="schedule-total">
            Total weekly hours (auto-calculated): <strong>{previewTotalHours(lines).toFixed(2)}h</strong>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
