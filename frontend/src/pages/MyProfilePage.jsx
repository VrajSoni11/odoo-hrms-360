import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export default function MyProfilePage() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/employees/me')
      .then((res) => setEmployee(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load your profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page">Loading...</div>;
  if (error) return <div className="page"><p className="form-error">{error}</p></div>;

  return (
    <div className="page">
      <h2>My Profile</h2>
      <div className="profile-card">
        <p><strong>Name:</strong> {employee.name}</p>
        <p><strong>Work Email:</strong> {employee.workEmail}</p>
        <p><strong>Job Position:</strong> {employee.jobPosition || '—'}</p>
        <p><strong>Department:</strong> {employee.department?.name || '—'}</p>
        <p><strong>Manager:</strong> {employee.manager?.name || '—'}</p>
        <p><strong>Status:</strong> <span className={`badge badge-${employee.status}`}>{employee.status}</span></p>
      </div>
      <p className="hint-text">This is a read-only view. Contact HR to update your details.</p>
    </div>
  );
}
