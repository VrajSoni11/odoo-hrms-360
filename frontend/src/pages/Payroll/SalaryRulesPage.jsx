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
import { AlertCircle, Calculator, ListTree, Pencil, Plus, Trash2, X } from "lucide-react";
import { SkeletonTable } from "../../components/ui/Skeleton.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { formatMoney } from "../../utils/format.js";

// Visible to all Payroll roles (see App.jsx route guard). HR Payroll User
// can view rules read-only; Admin and HR Payroll Manager can edit them.
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
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initial);
  const [wage, setWage] = useState("100000");
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const load = () => {
    if (!structureId) return;
    setLoading(true);
    getSalaryStructure(structureId).then(({ data }) => setStructure(data));
    getSalaryRules(structureId)
      .then(({ data }) => setRules(data))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load salary rules"),
      )
      .finally(() => setLoading(false));
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
        <div className="page-header">
          <div>
            <div className="page-eyebrow">Finance</div>
            <h1>Salary Rules</h1>
          </div>
        </div>
        <EmptyState
          icon={ListTree}
          title="No salary structure selected"
          description="Pick a structure from Salary Structures to view and edit its rules."
        />
      </div>
    );
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1>{structure?.name || "Salary"} Rules</h1>
          <div className="page-subtitle">{loading ? "Loading…" : `${rules.length} rule(s)`}</div>
        </div>
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
          {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
          <button className="btn btn-primary">
            {editing ? <><Pencil size={15} /> Save Rule</> : <><Plus size={15} /> Add Rule</>}
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
              <X size={15} /> Cancel
            </button>
          )}
        </form>
      )}
      {!canWrite && error && <div className="form-error"><AlertCircle size={16} />{error}</div>}

      {loading ? (
        <SkeletonTable rows={4} columns={6} />
      ) : rules.length === 0 ? (
        <EmptyState
          icon={ListTree}
          title="No rules on this structure yet"
          description={canWrite ? "Add a rule above to start building this salary structure." : "This structure has no salary rules configured yet."}
        />
      ) : (
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
                <td className="row-actions">
                  {canWrite && (
                    <>
                      <button
                        className="btn btn-small btn-secondary"
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
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => deleteSalaryRule(r.id).then(load)}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="section-title">Preview</div>
        <label>
          Sample wage
          <input
            type="number"
            value={wage}
            onChange={(e) => setWage(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" onClick={runPreview}>
          <Calculator size={15} /> Compute Preview
        </button>
        {preview && (
          <table className="data-table" style={{ marginTop: 14 }}>
            <colgroup>
              <col />
              <col style={{ width: 160 }} />
            </colgroup>
            <tbody>
              {preview.lines.map((line) => (
                <tr key={line.code}>
                  <td>{line.code}</td>
                  <td className="amount">
                    {line.amount === null ? line.error : formatMoney(line.amount)}
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
