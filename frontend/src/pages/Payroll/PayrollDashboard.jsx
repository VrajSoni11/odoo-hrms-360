import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Banknote,
  CalendarCheck,
  FileText,
  RotateCcw,
  Wallet,
} from "lucide-react";
import {
  getAttendanceOverview,
  getDashboardAlerts,
  getDashboardKpis,
  getDepartmentOverview,
  getSalaryByDepartment,
  getSalaryTrend,
  getTimeoffOverview,
} from "../../api/dashboard.api";
import client from "../../api/client";
import StatCard from "../../components/ui/StatCard.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { formatMoney } from "../../utils/format.js";
import { SkeletonStatGrid } from "../../components/ui/Skeleton.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

const PIE_COLORS = {
  Present: "var(--success)",
  Late: "var(--warning)",
  Absent: "var(--danger)",
  Overtime: "var(--indigo-600)",
  "Missing Checkouts": "#9297ab",
  "Manual Edits": "var(--info)",
};

function Panel({ title, action, children }) {
  return (
    <section className="panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function money(v) {
  return `₹${formatMoney(v)}`;
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthStr(monthStr, delta) {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function CurrencyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, boxShadow: "var(--shadow-sm)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name || p.dataKey}: <strong>{money(p.value)}</strong>
        </div>
      ))}
      {payload[0]?.payload?.paidThisPeriod != null && (
        <div style={{ color: "var(--text-muted)", marginTop: 2, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
          Paid this period: <strong>{money(payload[0].payload.paidThisPeriod)}</strong>
        </div>
      )}
    </div>
  );
}

const DEFAULT_FILTERS = { period: currentMonthStr(), departmentId: "", employeeType: "" };

export default function PayrollDashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [departments, setDepartments] = useState([]);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    client.get("/departments").then((r) => setDepartments(r.data)).catch(() => {});
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setError("");
    const calls = [
      getDashboardKpis,
      getSalaryByDepartment,
      getSalaryTrend,
      getAttendanceOverview,
      getTimeoffOverview,
      getDepartmentOverview,
      getDashboardAlerts,
    ];
    Promise.all(calls.map((call) => call(filters)))
      .then((responses) =>
        setData({
          kpis: responses[0].data,
          salary: responses[1].data,
          trend: responses[2].data,
          attendance: responses[3].data,
          timeoff: responses[4].data,
          departments: responses[5].data,
          alerts: responses[6].data,
        }),
      )
      .catch((err) => setError(err.response?.data?.error || "Could not load dashboard"))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { refresh(); }, [refresh]);

  const change = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));

  const toggleDepartment = (departmentId) => {
    if (departmentId == null) return;
    setFilters((f) => ({ ...f, departmentId: String(f.departmentId) === String(departmentId) ? "" : String(departmentId) }));
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const activeDeptName = useMemo(
    () => departments.find((d) => String(d.id) === String(filters.departmentId))?.name,
    [departments, filters.departmentId],
  );

  const attendancePieData = useMemo(
    () => (data.attendance ? Object.entries(data.attendance).map(([name, value]) => ({ name, value })) : []),
    [data.attendance],
  );
  const attendanceTotal = attendancePieData.reduce((sum, d) => sum + d.value, 0);

  const departmentTotals = useMemo(() => {
    const rows = data.departments || [];
    return rows.reduce(
      (acc, r) => ({ headcount: acc.headcount + r.headcount, salaryExpenditure: acc.salaryExpenditure + r.salaryExpenditure }),
      { headcount: 0, salaryExpenditure: 0 },
    );
  }, [data.departments]);

  const hasActiveFilters = filters.period !== DEFAULT_FILTERS.period || filters.departmentId || filters.employeeType;

  return (
    <div className="page" style={{ maxWidth: 1240 }}>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1>Payroll Dashboard</h1>
          <div className="page-subtitle">Salary spend, attendance and time-off at a glance</div>
        </div>
      </div>

      <div className="filter-bar">
        <label style={{ marginBottom: 0 }}>
          Period
          <input type="month" value={filters.period} onChange={change("period")} />
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="btn-ghost" onClick={() => setFilters((f) => ({ ...f, period: shiftMonthStr(f.period, -1) }))}>‹ Prev</button>
          <button type="button" className="btn-ghost" onClick={() => setFilters((f) => ({ ...f, period: currentMonthStr() }))}>This month</button>
          <button type="button" className="btn-ghost" onClick={() => setFilters((f) => ({ ...f, period: shiftMonthStr(f.period, 1) }))}>Next ›</button>
        </div>
        <label style={{ marginBottom: 0 }}>
          Department
          <select value={filters.departmentId} onChange={change("departmentId")}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label style={{ marginBottom: 0 }}>
          Employee type
          <select value={filters.employeeType} onChange={change("employeeType")}>
            <option value="">All</option>
            <option value="full_time">Full-Time</option>
            <option value="part_time">Part-Time</option>
            <option value="contract">Contract</option>
          </select>
        </label>
        {hasActiveFilters && (
          <button type="button" className="btn-ghost" onClick={resetFilters} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RotateCcw size={14} /> Reset
          </button>
        )}
        {activeDeptName && (
          <span className="badge badge-info" style={{ marginLeft: "auto" }}>
            Filtered to {activeDeptName} — click again to clear
          </span>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading && !data.kpis ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <div className="stat-grid">
          <StatCard
            icon={Banknote}
            tone="success"
            label="Total Net Salary Paid"
            value={money(data.kpis?.totalNetSalaryPaid ?? 0)}
          />
          <StatCard
            icon={FileText}
            tone="info"
            label="Payslips Generated"
            value={data.kpis?.payslipsGenerated ?? 0}
          />
          <StatCard
            icon={Wallet}
            label="Average Salary"
            value={money(data.kpis?.averageSalary ?? 0)}
          />
          <StatCard
            icon={CalendarCheck}
            tone="warning"
            label="Approved Time Off"
            value={data.kpis?.approvedTimeOff ?? 0}
          />
        </div>
      )}

      <div className="panel-grid">
        <Panel title="Salary Cost by Department" action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>Click a bar to filter</span>}>
          {data.salary?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.salary} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="department" stroke="var(--text-faint)" fontSize={12} />
                <YAxis stroke="var(--text-faint)" fontSize={12} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip content={<CurrencyTooltip />} cursor={{ fill: "var(--bg-sunken)" }} />
                <Bar
                  dataKey="net"
                  name="Monthly salary cost"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={72}
                  onClick={(entry) => toggleDepartment(entry.departmentId)}
                  style={{ cursor: "pointer" }}
                  label={{ position: "top", formatter: (v) => (v ? `₹${Math.round(v / 1000)}k` : ""), fontSize: 11, fill: "var(--text-muted)" }}
                >
                  {data.salary.map((entry) => (
                    <Cell
                      key={entry.department}
                      fill={String(entry.departmentId) === String(filters.departmentId) ? "var(--indigo-600)" : "var(--indigo-500)"}
                      opacity={filters.departmentId && String(entry.departmentId) !== String(filters.departmentId) ? 0.45 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="dashboard-empty">No department data for this period.</div>
          )}
          <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 6 }}>
            Based on active contracts • tooltip also shows what was actually paid out in the selected period
          </div>
        </Panel>
        <Panel title="Monthly Net Salary Trend">
          {data.trend?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.trend} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-faint)" fontSize={12} />
                <YAxis stroke="var(--text-faint)" fontSize={12} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip content={<CurrencyTooltip />} />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net salary"
                  stroke="var(--success)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--success)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="dashboard-empty">No trend data available.</div>
          )}
        </Panel>
      </div>

      <div className="panel-grid" style={{ marginTop: 16 }}>
        <Panel title="Attendance Overview">
          {data.attendance && attendanceTotal > 0 ? (
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={attendancePieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={64} paddingAngle={2}>
                    {attendancePieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] || "var(--text-faint)"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="dashboard-stat-grid" style={{ flex: 1, minWidth: 200 }}>
                {Object.entries(data.attendance).map(([label, value]) => (
                  <div className="dashboard-stat" key={label}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: PIE_COLORS[label] || "var(--text-faint)", display: "inline-block" }} />
                      {label}
                    </span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="dashboard-stat-grid">
                {Object.keys(PIE_COLORS).map((label) => (
                  <div className="dashboard-stat" key={label}>
                    <span>{label}</span>
                    <strong>0</strong>
                  </div>
                ))}
              </div>
              <div className="dashboard-empty" style={{ marginTop: 10 }}>
                No check-ins recorded for {filters.period}. Try "This month" or an earlier period.
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Time Off Overview">
          {data.timeoff ? (
            <div className="dashboard-stat-grid">
              <div className="dashboard-stat">
                <span>Approved days</span>
                <strong>{data.timeoff.approvedDays}</strong>
              </div>
              <div className="dashboard-stat">
                <span>Pending requests</span>
                <strong>{data.timeoff.pendingRequests}</strong>
              </div>
              <div className="dashboard-stat">
                <span>Remaining balance</span>
                <strong>{data.timeoff.remainingBalance}</strong>
              </div>
            </div>
          ) : (
            <div className="dashboard-empty">No time-off data for this period.</div>
          )}
        </Panel>
        <Panel title="Department Overview" action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>Click a row to filter</span>}>
          {data.departments?.length ? (
            <div className="table-scroll">
              <table className="dashboard-table dashboard-table--departments">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Headcount</th>
                    <th className="amount">Salary expenditure</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departments.map((department) => {
                    const selected = String(department.departmentId) === String(filters.departmentId);
                    return (
                      <tr
                        key={department.department}
                        onClick={() => toggleDepartment(department.departmentId)}
                        style={{ cursor: department.departmentId != null ? "pointer" : "default", background: selected ? "var(--accent-light)" : undefined }}
                      >
                        <td>{department.department}</td>
                        <td>{department.headcount}</td>
                        <td className="amount">{formatMoney(department.salaryExpenditure)}</td>
                        <td className="share-cell">
                          <div className="share-bar-wrap">
                            <div className="share-bar-track">
                              <div className="share-bar-fill" style={{ width: `${Math.min(100, department.share ?? 0)}%` }} />
                            </div>
                            <span className="share-bar-label">{department.share ?? 0}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600 }}>
                    <td>Total</td>
                    <td>{departmentTotals.headcount}</td>
                    <td className="amount">{formatMoney(departmentTotals.salaryExpenditure)}</td>
                    <td>100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="dashboard-empty">No department data for this period.</div>
          )}
        </Panel>
        <Panel title="Alerts">
          {data.alerts?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto" }}>
              {data.alerts.map((alert) => (
                <div key={alert.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StatusBadge status={alert.severity} />
                  <span style={{ fontSize: 13 }}>{alert.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={AlertTriangle} title="No unresolved alerts" description="You're all caught up." />
          )}
        </Panel>
      </div>
    </div>
  );
}
