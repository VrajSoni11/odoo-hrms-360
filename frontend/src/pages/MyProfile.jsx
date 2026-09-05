import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { User } from 'lucide-react';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function MyProfile() {
  const { user } = useAuth();
  const emp = user.employee;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Account</div>
          <h1>My Profile</h1>
        </div>
      </div>

      {emp ? (
        <>
          <div className="profile-header">
            <div className="avatar avatar-lg">{initials(emp.name)}</div>
            <div className="profile-header-info">
              <div className="profile-header-name">{emp.name}</div>
              <div className="profile-header-role">{emp.jobPosition || 'No job position set'}</div>
              <div className="profile-header-meta">
                <span>{emp.department?.name || 'Unassigned department'}</span>
                <span>{emp.schedule?.name || 'No schedule'}</span>
              </div>
            </div>
            <StatusBadge status={emp.status} />
          </div>

          <div className="card card-flush" style={{ maxWidth: 560 }}>
            <div className="section-title">Employment Details</div>
            <div className="field-row"><span className="field-label">Work Email</span><span>{emp.workEmail}</span></div>
            <div className="field-row"><span className="field-label">Department</span><span>{emp.department?.name || '—'}</span></div>
            <div className="field-row"><span className="field-label">Job Position</span><span>{emp.jobPosition || '—'}</span></div>
            <div className="field-row"><span className="field-label">Status</span><span><StatusBadge status={emp.status} /></span></div>
            <div className="field-row"><span className="field-label">Schedule</span><span>{emp.schedule?.name || '—'}</span></div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={User}
          title="No employee record linked"
          description="This login is not linked to an employee record, so profile details aren't available."
        />
      )}
    </div>
  );
}
