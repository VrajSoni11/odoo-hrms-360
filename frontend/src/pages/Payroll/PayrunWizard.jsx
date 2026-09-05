import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Rocket } from "lucide-react";
import { createPayrun, getEligibleEmployees } from "../../api/payroll.api";
import { getSalaryStructures } from "../../api/salary.api";

export default function PayrunWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [structures, setStructures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    salaryStructureId: "",
    periodStart: "",
    periodEnd: "",
  });
  useEffect(() => {
    getSalaryStructures().then(({ data }) =>
      setStructures(data.filter((s) => s.isActive)),
    );
  }, []);
  async function continueStep(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await getEligibleEmployees(
        form.periodStart,
        form.periodEnd,
      );
      setEmployees(data);
      setSelected(data.map((employee) => employee.id));
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.error || "Could not load eligible employees",
      );
    }
  }
  async function submit() {
    try {
      const { data } = await createPayrun({ ...form, employeeIds: selected });
      navigate(`/payroll/payruns/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Could not create payrun");
    }
  }
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1>New Payrun</h1>
          <div className="page-subtitle">Step {step} of 2 — {step === 1 ? "Period & structure" : "Select employees"}</div>
        </div>
      </div>
      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
      {step === 1 ? (
        <form className="card" onSubmit={continueStep}>
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Salary structure
            <select
              required
              value={form.salaryStructureId}
              onChange={(e) =>
                setForm({ ...form, salaryStructureId: e.target.value })
              }
            >
              <option value="">Select structure</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Period start
            <input
              type="date"
              required
              value={form.periodStart}
              onChange={(e) =>
                setForm({ ...form, periodStart: e.target.value })
              }
            />
          </label>
          <label>
            Period end
            <input
              type="date"
              required
              value={form.periodEnd}
              onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
            />
          </label>
          <button className="btn btn-primary">
            <ArrowRight size={15} /> Continue
          </button>
        </form>
      ) : (
        <div>
          <div className="section-title">Select employees</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Include</th>
                <th>Name</th>
                <th>Department</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(employee.id)}
                      onChange={() =>
                        setSelected(
                          selected.includes(employee.id)
                            ? selected.filter((id) => id !== employee.id)
                            : [...selected, employee.id],
                        )
                      }
                    />
                  </td>
                  <td>{employee.name}</td>
                  <td>{employee.department?.name}</td>
                  <td>{employee.employeeType}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            disabled={!selected.length}
            onClick={submit}
          >
            <Rocket size={15} /> Create Payrun
          </button>
        </div>
      )}
    </div>
  );
}
