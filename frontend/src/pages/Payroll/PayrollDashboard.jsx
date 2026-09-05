import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
import StatCard from "../../components/ui/StatCard.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { formatMoney } from "../../utils/format.js";
import { SkeletonStatGrid } from "../../components/ui/Skeleton.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function PayrollDashboard() {
  const [filters, setFilters] = useState({
    period: "2025-01",
    departmentId: "",
    employeeType: "",
  });
  const [data, setData] = useState({});
  const [error, setError] = useState("");
  useEffect(() => {
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
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load dashboard"),
      );
  }, [filters]);
  const change = (field) => (e) =>
    setFilters({ ...filters, [field]: e.target.value });

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
        <label style={{ marginBottom: 0 }}>
          Department
          <input value={filters.departmentId} placeholder="Department ID" onChange={change("departmentId")} />
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
      </div>

      {error && <div className="form-error">{error}</div>}

      {!data.kpis ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <div className="stat-grid">
          <StatCard
            icon={Banknote}
            tone="success"
            label="Total Net Salary Paid"
            value={data.kpis.totalNetSalaryPaid.toFixed(2)}
          />
          <StatCard
            icon={FileText}
            tone="info"
            label="Payslips Generated"
            value={data.kpis.payslipsGenerated ?? 0}
          />
          <StatCard
            icon={Wallet}
            label="Average Salary"
            value={data.kpis.averageSalary.toFixed(2)}
          />
          <StatCard
            icon={CalendarCheck}
            tone="warning"
            label="Approved Time Off"
            value={data.kpis.approvedTimeOff ?? 0}
          />
        </div>
      )}

      <div className="panel-grid">
        <Panel title="Salary Cost by Department">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.salary || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="department" stroke="var(--text-faint)" fontSize={12} />
              <YAxis stroke="var(--text-faint)" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)' }} />
              <Bar dataKey="net" fill="var(--indigo-600)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Monthly Net Salary Trend">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-faint)" fontSize={12} />
              <YAxis stroke="var(--text-faint)" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)' }} />
              <Line type="monotone" dataKey="net" stroke="var(--success)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="panel-grid" style={{ marginTop: 16 }}>
        <Panel title="Attendance Overview">
          {data.attendance ? (
            <div className="dashboard-stat-grid">
              {Object.entries(data.attendance).map(([label, value]) => (
                <div className="dashboard-stat" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">No attendance data for this period.</div>
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
        <Panel title="Department Overview">
          {data.departments?.length ? (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Headcount</th>
                  <th className="amount">Salary expenditure</th>
                </tr>
              </thead>
              <tbody>
                {data.departments.map((department) => (
                  <tr key={department.department}>
                    <td>{department.department}</td>
                    <td>{department.headcount}</td>
                    <td className="amount">{formatMoney(department.salaryExpenditure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="dashboard-empty">No department data for this period.</div>
          )}
        </Panel>
        <Panel title="Alerts">
          {data.alerts?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.alerts.map((alert) => (
                <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
