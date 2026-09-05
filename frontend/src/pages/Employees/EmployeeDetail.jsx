import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [contractCount, setContractCount] = useState(0);

  useEffect(() => {
    client.get(`/employees/${id}`).then((r) => setEmployee(r.data));
    client.get(`/employees/${id}/contracts`).then((r) => setContractCount(r.data.length));
  }, [id]);

  if (!employee) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{employee.name}</h1>
        <button className="btn btn-ghost" onClick={() => navigate('/employees')}>← Back to Employees</button>
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

      <div className="card">
        <div className="field-row"><span className="field-label">Work Email</span><span>{employee.workEmail}</span></div>
        <div className="field-row"><span className="field-label">Phone</span><span>{employee.phone || '—'}</span></div>
        <div className="field-row"><span className="field-label">Department</span><span>{employee.department?.name || '—'}</span></div>
        <div className="field-row"><span className="field-label">Manager</span><span>{employee.manager?.name || '—'}</span></div>
        <div className="field-row"><span className="field-label">Job Position</span><span>{employee.jobPosition || '—'}</span></div>
        <div className="field-row"><span className="field-label">Working Schedule</span><span>{employee.schedule?.name || '—'}</span></div>
        <div className="field-row"><span className="field-label">Employee Type</span><span>{employee.employeeType}</span></div>
        <div className="field-row"><span className="field-label">Status</span><span className={`badge badge-${employee.status}`}>{employee.status}</span></div>
      </div>
    </div>
  );
}
