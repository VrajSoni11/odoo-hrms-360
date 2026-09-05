import React, { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AttendanceWidget from "./AttendanceWidget.jsx";

const NAV_RULES = {
  employees: ["Admin", "HR Manager", "HR Payroll User", "HR Payroll Manager"],
  timeOff: [
    "Admin",
    "HR Manager",
    "HR Payroll User",
    "HR Payroll Manager",
    "Employee",
  ],
  payroll: ["Admin", "HR Payroll User", "HR Payroll Manager"],
  userManagement: ["Admin"],
};

function canSee(role, key) {
  return NAV_RULES[key].includes(role);
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [employeesMenuOpen, setEmployeesMenuOpen] = useState(false);
  const [timeOffMenuOpen, setTimeOffMenuOpen] = useState(false);
  const [payrollMenuOpen, setPayrollMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-brand">PeoplePay360</div>

        <nav className="topnav-links">
          {canSee(user.role, "employees") && (
            <div
              className="nav-dropdown"
              onMouseEnter={() => setEmployeesMenuOpen(true)}
              onMouseLeave={() => setEmployeesMenuOpen(false)}
            >
              <span className="nav-link">Employees ▾</span>
              {employeesMenuOpen && (
                <div className="nav-dropdown-menu">
                  <Link to="/employees">Employees</Link>
                  <Link to="/departments">Departments</Link>
                  <Link to="/schedules">Working Schedules</Link>
                </div>
              )}
            </div>
          )}

          <Link className="nav-link" to="/attendance">
            Attendance
          </Link>

          {canSee(user.role, "timeOff") && (
            <div
              className="nav-dropdown"
              onMouseEnter={() => setTimeOffMenuOpen(true)}
              onMouseLeave={() => setTimeOffMenuOpen(false)}
            >
              <span className="nav-link">Time Off ▾</span>
              {timeOffMenuOpen && (
                <div className="nav-dropdown-menu">
                  <Link to="/time-off/my-requests">My Requests</Link>
                  {canSee(user.role, "employees") && (
                    <>
                      <Link to="/time-off/approvals">Approvals</Link>
                      <Link to="/time-off/allocations">Allocations</Link>
                      <Link to="/time-off/types">Time Off Types</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {canSee(user.role, "payroll") && (
            <div
              className="nav-dropdown"
              onMouseEnter={() => setPayrollMenuOpen(true)}
              onMouseLeave={() => setPayrollMenuOpen(false)}
            >
              <span className="nav-link">Payroll ▾</span>
              {payrollMenuOpen && (
                <div className="nav-dropdown-menu">
                  <Link to="/payroll/dashboard">Dashboard</Link>
                  <Link to="/payroll/payruns">Payruns</Link>
                  <Link to="/payroll/salary-structures">Salary Structures</Link>
                  <Link to="/payroll/salary-rules">Salary Rules</Link>
                  <Link to="/payroll/payslips">Payslips</Link>
                </div>
              )}
            </div>
          )}

          {canSee(user.role, "userManagement") && (
            <Link className="nav-link" to="/users">
              User Management
            </Link>
          )}
        </nav>

        <div className="topnav-user">
          <span className="topnav-user-name">
            {user.employee?.name || user.email}
          </span>
          <span className="topnav-user-role">{user.role}</span>
          {user.employee && <AttendanceWidget />}
          <button className="btn btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
