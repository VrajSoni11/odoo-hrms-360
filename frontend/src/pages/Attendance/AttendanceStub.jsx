import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AttendanceStub() {
  const { user } = useAuth();
  return (
    <div className="page">
      <h1>Attendance</h1>
      <div className="stub-card">
        <p>Coming in Phase 2: check-in/check-out widget, worked hours, and manual corrections.</p>
        <p className="stub-muted">Logged in as {user.role} — this page will scope to your own records if you're an Employee, or show the global list if you're HR Manager and above.</p>
      </div>
    </div>
  );
}
