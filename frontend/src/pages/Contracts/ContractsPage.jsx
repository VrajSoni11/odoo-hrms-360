import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, FileSignature, Pencil, Plus, Trash2 } from 'lucide-react';
import client from '../../api/client';
import ContractFormModal from './ContractFormModal.jsx';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

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
  const [loading, setLoading] = useState(true);
  const [editingContract, setEditingContract] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = employeeIdFilter ? { employeeId: employeeIdFilter } : {};
    Promise.all([
      client.get('/contracts', { params }),
      client.get('/employees'),
    ])
      .then(([contractsRes, employeesRes]) => {
        setContracts(contractsRes.data);
        setEmployees(employeesRes.data);
      })
      .catch((err) => setError(err.response?.data?.error || 'Could not load contracts'))
      .finally(() => setLoading(false));
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
        <div>
          <div className="page-eyebrow">Workforce</div>
          <h1>Contracts</h1>
          <div className="page-subtitle">
            {filterLabel ? `Showing contracts for ${filterLabel}` : loading ? 'Loading…' : `${contracts.length} contract(s) on record`}
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Contract</button>
        </div>
      </div>
      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}

      {loading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : contracts.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No contracts yet"
          description="Create a contract to define an employee's wage, schedule and salary structure."
          action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Contract</button>}
        />
      ) : (
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
                  <button className="btn btn-small btn-secondary" onClick={() => openEdit(c)}><Pencil size={13} /> Edit</button>
                  <button className="btn btn-small btn-danger" onClick={() => handleDelete(c)}><Trash2 size={13} /> Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
