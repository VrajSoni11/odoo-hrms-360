import React, { useEffect, useState } from "react";
import client from "../../api/client";

function toDateInput(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default function ContractFormModal({
  contract,
  defaultEmployeeId,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    employeeId: defaultEmployeeId || "",
    departmentId: "",
    jobPosition: "",
    scheduleId: "",
    salaryStructureId: "",
    startDate: "",
    endDate: "",
    wage: "",
    state: "draft",
  });
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client.get("/employees").then((r) => setEmployees(r.data));
    client.get("/departments").then((r) => setDepartments(r.data));
    client.get("/schedules").then((r) => setSchedules(r.data));
    client.get("/salary-structures").then((r) => setSalaryStructures(r.data));
  }, []);

  useEffect(() => {
    if (contract) {
      setForm({
        employeeId: contract.employeeId,
        departmentId: contract.departmentId || "",
        jobPosition: contract.jobPosition || "",
        scheduleId: contract.scheduleId || "",
        salaryStructureId: contract.salaryStructureId || "",
        startDate: toDateInput(contract.startDate),
        endDate: toDateInput(contract.endDate),
        wage: contract.wage,
        state: contract.state,
      });
    }
  }, [contract]);

  const handleChange = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      ...form,
      employeeId: Number(form.employeeId),
      departmentId: form.departmentId || null,
      scheduleId: form.scheduleId || null,
      salaryStructureId: form.salaryStructureId || null,
      endDate: form.endDate || null,
      wage: Number(form.wage),
    };
    try {
      if (contract) {
        await client.put(`/contracts/${contract.id}`, payload);
      } else {
        await client.post("/contracts", payload);
      }
      onSaved();
    } catch (err) {
      // This is where the overlap-constraint error surfaces to the user
      setError(err.response?.data?.error || "Could not save contract");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{contract ? "Edit Contract" : "New Contract"}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Employee
            <select
              required
              value={form.employeeId}
              onChange={handleChange("employeeId")}
              disabled={!!defaultEmployeeId}
            >
              <option value="">— Select employee —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Department
            <select
              value={form.departmentId}
              onChange={handleChange("departmentId")}
            >
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Job Position
            <input
              value={form.jobPosition}
              onChange={handleChange("jobPosition")}
            />
          </label>

          <label>
            Working Schedule
            <select
              value={form.scheduleId}
              onChange={handleChange("scheduleId")}
            >
              <option value="">— None —</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Salary Structure
            <select
              value={form.salaryStructureId}
              onChange={handleChange("salaryStructureId")}
            >
              <option value="">— None —</option>
              {salaryStructures
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>

          <div className="form-row">
            <label>
              Start Date
              <input
                type="date"
                required
                value={form.startDate}
                onChange={handleChange("startDate")}
              />
            </label>
            <label>
              End Date (leave blank = open-ended)
              <input
                type="date"
                value={form.endDate}
                onChange={handleChange("endDate")}
              />
            </label>
          </div>

          <label>
            Wage (monthly)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.wage}
              onChange={handleChange("wage")}
            />
          </label>

          <label>
            State
            <select value={form.state} onChange={handleChange("state")}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          {error && (
            <div className="form-error">
              {error}
              <div className="form-error-hint">
                Only one ACTIVE contract per employee per date range is allowed
                — this is enforced at the database level.
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
