import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import client from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [contractCount, setContractCount] = useState(0);

  useEffect(() => {
    client.get(`/employees/${id}`).then((r) => setEmployee(r.data));
    client.get(`/employees/${id}/contracts`).then((r) => setContractCount(r.data.length));
  }, [id]);

  if (!employee) {
    return (
      <div className="page">
        <Skeleton height={90} style={{ borderRadius: 14, marginBottom: 22 }} />
        <Skeleton height={180} style={{ borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-eyebrow">Employee Profile</div>
        <button className="btn btn-ghost" onClick={() => navigate('/employees')}>
          <ArrowLeft size={15} /> Back to Employees
        </button>
      </div>

      <div className="profile-header">
        <div className="avatar avatar-lg">{initials(employee.name)}</div>
        <div className="profile-header-info">
          <div className="profile-header-name">{employee.name}</div>
          <div className="profile-header-role">{employee.jobPosition || 'No job position'} · {employee.department?.name || 'Unassigned'}</div>
          <div className="profile-header-meta">
            <span>{employee.employeeType}</span>
            <span>{employee.schedule?.name || 'No schedule'}</span>
          </div>
        </div>
        <StatusBadge status={employee.status} />
      </div>

      <div className="smart-buttons">
        <button className="smart-button" onClick={() => navigate(`/contracts?employeeId=${employee.id}`)}>
          <span className="smart-button-count">{contractCount}</span>
          <span className="smart-button-label">Contracts</span>
        </button>
        <button className="smart-button" disabled>
          <span className="smart-button-count">0</span>
          <span className="smart-button-label">Attendance (Phase 2)</span>
        </button>
        <button className="smart-button" disabled>
          <span className="smart-button-count">0</span>
          <span className="smart-button-label">Time Off (Phase 3)</span>
        </button>
      </div>

      <div className="detail-grid">
        <div className="card card-flush">
          <div className="section-title">Contact Information</div>
          <div className="field-row"><span className="field-label">Work Email</span><span>{employee.workEmail}</span></div>
          <div className="field-row"><span className="field-label">Phone</span><span>{employee.phone || '—'}</span></div>
        </div>
        <div className="card card-flush">
          <div className="section-title">Employment Information</div>
          <div className="field-row"><span className="field-label">Department</span><span>{employee.department?.name || '—'}</span></div>
          <div className="field-row"><span className="field-label">Manager</span><span>{employee.manager?.name || '—'}</span></div>
          <div className="field-row"><span className="field-label">Job Position</span><span>{employee.jobPosition || '—'}</span></div>
          <div className="field-row"><span className="field-label">Working Schedule</span><span>{employee.schedule?.name || '—'}</span></div>
          <div className="field-row"><span className="field-label">Employee Type</span><span>{employee.employeeType}</span></div>
          <div className="field-row"><span className="field-label">Status</span><span><StatusBadge status={employee.status} /></span></div>
        </div>
      </div>
    </div>
  );
}
