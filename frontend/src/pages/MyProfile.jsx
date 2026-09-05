import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function MyProfile() {
  const { user } = useAuth();
  const emp = user.employee;

  return (
    <div className="page">
      <h1>My Profile</h1>
      {emp ? (
        <div className="card">
          <div className="field-row"><span className="field-label">Name</span><span>{emp.name}</span></div>
          <div className="field-row"><span className="field-label">Work Email</span><span>{emp.workEmail}</span></div>
          <div className="field-row"><span className="field-label">Department</span><span>{emp.department?.name || '—'}</span></div>
          <div className="field-row"><span className="field-label">Job Position</span><span>{emp.jobPosition || '—'}</span></div>
          <div className="field-row"><span className="field-label">Status</span><span>{emp.status}</span></div>
          <div className="field-row"><span className="field-label">Schedule</span><span>{emp.schedule?.name || '—'}</span></div>
        </div>
      ) : (
        <p>This login is not linked to an employee record.</p>
      )}
    </div>
  );
}
