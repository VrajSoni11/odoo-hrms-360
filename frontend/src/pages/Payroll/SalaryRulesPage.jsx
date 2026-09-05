import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createSalaryRule,
  deleteSalaryRule,
  getSalaryRules,
  getSalaryStructure,
  previewSalary,
  updateSalaryRule,
} from "../../api/salary.api";
import { useAuth } from "../../context/AuthContext.jsx";

const WRITE_ROLES = ["Admin", "HR Payroll Manager"];
const initial = {
  name: "",
  code: "",
  category: "basic",
  sequence: 10,
  computationMethod: "fixed",
  amount: "",
  percentageOf: "",
  percentageRate: "",
  formula: "",
};

export default function SalaryRulesPage() {
  const [params] = useSearchParams();
  const structureId = params.get("structureId");
  const { user } = useAuth();
  const canWrite = WRITE_ROLES.includes(user.role);
  const [structure, setStructure] = useState(null);
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(initial);
  const [wage, setWage] = useState("100000");
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const load = () => {
    if (!structureId) return;
    getSalaryStructure(structureId).then(({ data }) => setStructure(data));
    getSalaryRules(structureId)
      .then(({ data }) => setRules(data))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load salary rules"),
      );
  };
  useEffect(load, [structureId]);
  function change(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      if (editing) await updateSalaryRule(editing.id, form);
      else await createSalaryRule({ ...form, structureId });
      setForm(initial);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save salary rule");
    }
  }
  async function runPreview() {
    setError("");
    try {
      const { data } = await previewSalary(structureId, wage);
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.error || "Could not preview salary");
    }
  }
  if (!structureId)
    return (
      <div className="page">
        <h1>Salary Rules</h1>
        <p>Select a salary structure first.</p>
      </div>
    );
  return (
    <div className="page">
      <div className="page-header">
        <h1>{structure?.name || "Salary"} Rules</h1>
      </div>
      {canWrite && (
        <form className="card" onSubmit={save}>
          <label>
            Name
            <input required value={form.name} onChange={change("name")} />
          </label>
          <label>
            Code
            <input required value={form.code} onChange={change("code")} />
          </label>
          <label>
            Category
            <select value={form.category} onChange={change("category")}>
              {["basic", "allowance", "gross", "deduction", "net"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Sequence
            <input
              type="number"
              required
              value={form.sequence}
              onChange={change("sequence")}
            />
          </label>
          <label>
            Method
            <select
              value={form.computationMethod}
              onChange={change("computationMethod")}
            >
              <option value="fixed">Fixed</option>
              <option value="percentage">Percentage</option>
              <option value="formula">Formula</option>
            </select>
          </label>
          {form.computationMethod === "fixed" && (
            <label>
              Amount
              <input
                type="number"
                step="0.01"
                required
                value={form.amount}
                onChange={change("amount")}
              />
            </label>
          )}
          {form.computationMethod === "percentage" && (
            <>
              <label>
                Percentage of
                <input
                  required
                  value={form.percentageOf}
                  onChange={change("percentageOf")}
                />
              </label>
              <label>
                Rate (%)
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.percentageRate}
                  onChange={change("percentageRate")}
                />
              </label>
            </>
          )}
          {form.computationMethod === "formula" && (
            <label>
              Formula
              <input
                required
                placeholder="BASIC + HRA"
                value={form.formula}
                onChange={change("formula")}
              />
            </label>
          )}
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary">
            {editing ? "Save Rule" : "Add Rule"}
          </button>
          {editing && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditing(null);
                setForm(initial);
              }}
            >
              Cancel
            </button>
          )}
        </form>
      )}
      {!canWrite && error && <div className="form-error">{error}</div>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Sequence</th>
            <th>Code</th>
            <th>Name</th>
            <th>Method</th>
            <th>Category</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id}>
              <td>{r.sequence}</td>
              <td>{r.code}</td>
              <td>{r.name}</td>
              <td>{r.computationMethod}</td>
              <td>{r.category}</td>
              <td>
                {canWrite && (
                  <>
                    <button
                      className="btn btn-small"
                      onClick={() => {
                        setEditing(r);
                        setForm({
                          name: r.name,
                          code: r.code,
                          category: r.category,
                          sequence: r.sequence,
                          computationMethod: r.computationMethod,
                          amount: r.amount ?? "",
                          percentageOf: r.percentageOf ?? "",
                          percentageRate: r.percentageRate ?? "",
                          formula: r.formula ?? "",
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => deleteSalaryRule(r.id).then(load)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="card" style={{ marginTop: 20 }}>
        <h2>Preview</h2>
        <label>
          Sample wage
          <input
            type="number"
            value={wage}
            onChange={(e) => setWage(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" onClick={runPreview}>
          Compute Preview
        </button>
        {preview && (
          <table className="data-table">
            <tbody>
              {preview.lines.map((line) => (
                <tr key={line.code}>
                  <td>{line.code}</td>
                  <td>
                    {line.amount === null
                      ? line.error
                      : Number(line.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
