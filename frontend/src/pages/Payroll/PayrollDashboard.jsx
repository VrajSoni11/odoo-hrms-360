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
  getAttendanceOverview,
  getDashboardAlerts,
  getDashboardKpis,
  getDepartmentOverview,
  getSalaryByDepartment,
  getSalaryTrend,
  getTimeoffOverview,
} from "../../api/dashboard.api";

function KpiCard({ label, value }) {
  return (
    <div className="card">
      <div className="field-label">{label}</div>
      <strong style={{ fontSize: 24 }}>{value}</strong>
    </div>
  );
}
function Panel({ title, children }) {
  return (
    <section className="card" style={{ maxWidth: "none", flex: 1 }}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text }) {
  return <p className="dashboard-empty">{text}</p>;
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
    <div className="page" style={{ maxWidth: 1200 }}>
      <div className="page-header">
        <h1>Payroll Dashboard</h1>
      </div>
      <div
        className="card"
        style={{ maxWidth: "none", display: "flex", gap: 12 }}
      >
        <label>
          Period
          <input
            type="month"
            value={filters.period}
            onChange={change("period")}
          />
        </label>
        <label>
          Department
          <input
            value={filters.departmentId}
            placeholder="Department ID"
            onChange={change("departmentId")}
          />
        </label>
        <label>
          Employee type
          <select
            value={filters.employeeType}
            onChange={change("employeeType")}
          >
            <option value="">All</option>
            <option value="full_time">Full-Time</option>
            <option value="part_time">Part-Time</option>
            <option value="contract">Contract</option>
          </select>
        </label>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div style={{ display: "flex", gap: 12, margin: "16px 0" }}>
        <KpiCard
          label="Total Net Salary Paid"
          value={data.kpis ? data.kpis.totalNetSalaryPaid.toFixed(2) : "..."}
        />
        <KpiCard
          label="Payslips Generated"
          value={data.kpis?.payslipsGenerated ?? "..."}
        />
        <KpiCard
          label="Average Salary"
          value={data.kpis ? data.kpis.averageSalary.toFixed(2) : "..."}
        />
        <KpiCard
          label="Approved Time Off"
          value={data.kpis?.approvedTimeOff ?? "..."}
        />
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Panel title="Salary Cost by Department">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.salary || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="net" fill="#0271E4" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Monthly Net Salary Trend">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.trend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="net" stroke="#2F8F4E" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <div
        style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}
      >
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
            <EmptyState text="No attendance data for this period." />
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
            <EmptyState text="No time-off data for this period." />
          )}
        </Panel>
        <Panel title="Department Overview">
          {data.departments?.length ? (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Headcount</th>
                  <th>Salary expenditure</th>
                </tr>
              </thead>
              <tbody>
                {data.departments.map((department) => (
                  <tr key={department.department}>
                    <td>{department.department}</td>
                    <td>{department.headcount}</td>
                    <td>
                      {Number(department.salaryExpenditure).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState text="No department data for this period." />
          )}
        </Panel>
        <Panel title="Alerts">
          {data.alerts?.length ? (
            data.alerts.map((alert) => (
              <p key={alert.id}>
                <span className={`badge badge-${alert.severity}`}>
                  {alert.severity}
                </span>{" "}
                {alert.message}
              </p>
            ))
          ) : (
            <EmptyState text="No unresolved alerts." />
          )}
        </Panel>
      </div>
    </div>
  );
}
