import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '../../api/client';
import ContractFormModal from './ContractFormModal.jsx';

function isCurrentlyActive(contract) {
  if (contract.state !== 'active') return false;
  const today = new Date();
  const start = new Date(contract.startDate);
  const end = contract.endDate ? new Date(contract.endDate) : null;
  return start <= today && (end === null || end >= today);
}

export default function ContractsPage() {
  const [searchParams] = useSearchParams();
  const employeeIdFilter = searchParams.get('employeeId');

  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [editingContract, setEditingContract] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const params = employeeIdFilter ? { employeeId: employeeIdFilter } : {};
    client.get('/contracts', { params }).then((r) => setContracts(r.data));
    client.get('/employees').then((r) => setEmployees(r.data));
  }, [employeeIdFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingContract(null); setShowForm(true); };
  const openEdit = (c) => { setEditingContract(c); setShowForm(true); };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete this contract for ${c.employee?.name}?`)) return;
    try {
      await client.delete(`/contracts/${c.id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete contract');
    }
  };

  const filterLabel = employeeIdFilter
    ? employees.find((e) => e.id === Number(employeeIdFilter))?.name
    : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Contracts {filterLabel && <span className="page-subtitle">— {filterLabel}</span>}</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Contract</button>
      </div>
      {error && <div className="form-error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr><th>Employee</th><th>Job Position</th><th>Start</th><th>End</th><th>Wage</th><th>State</th><th></th></tr>
        </thead>
        <tbody>
          {contracts.map((c) => (
            <tr key={c.id} className={isCurrentlyActive(c) ? 'row-highlight' : ''}>
              <td>{c.employee?.name}</td>
              <td>{c.jobPosition || '—'}</td>
              <td>{new Date(c.startDate).toLocaleDateString()}</td>
              <td>{c.endDate ? new Date(c.endDate).toLocaleDateString() : '— (open-ended)'}</td>
              <td>{Number(c.wage).toLocaleString()}</td>
              <td>
                <span className={`badge badge-contract-${c.state}`}>{c.state}</span>
                {isCurrentlyActive(c) && <span className="badge badge-current">CURRENT</span>}
              </td>
              <td className="row-actions">
                <button className="btn btn-small" onClick={() => openEdit(c)}>Edit</button>
                <button className="btn btn-small btn-danger" onClick={() => handleDelete(c)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <ContractFormModal
          contract={editingContract}
          defaultEmployeeId={employeeIdFilter}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
