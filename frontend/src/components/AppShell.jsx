import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_RULES = {
  employees: ['Admin', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager'],
  timeOff: ['Admin', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Employee'],
  payroll: ['Admin', 'HR Payroll User', 'HR Payroll Manager'],
  userManagement: ['Admin'],
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
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-brand">PeoplePay360</div>

        <nav className="topnav-links">
          {canSee(user.role, 'employees') && (
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

          <Link className="nav-link" to="/attendance">Attendance</Link>

          {canSee(user.role, 'timeOff') && (
            <div
              className="nav-dropdown"
              onMouseEnter={() => setTimeOffMenuOpen(true)}
              onMouseLeave={() => setTimeOffMenuOpen(false)}
            >
              <span className="nav-link">Time Off ▾</span>
              {timeOffMenuOpen && (
                <div className="nav-dropdown-menu">
                  <span className="nav-dropdown-stub">Requests (Phase 3)</span>
                  <span className="nav-dropdown-stub">Allocations (Phase 3)</span>
                  <span className="nav-dropdown-stub">Time Off Types (Phase 3)</span>
                </div>
              )}
            </div>
          )}

          {canSee(user.role, 'payroll') && (
            <div
              className="nav-dropdown"
              onMouseEnter={() => setPayrollMenuOpen(true)}
              onMouseLeave={() => setPayrollMenuOpen(false)}
            >
              <span className="nav-link">Payroll ▾</span>
              {payrollMenuOpen && (
                <div className="nav-dropdown-menu">
                  <span className="nav-dropdown-stub">Payruns (Phase 5)</span>
                  <span className="nav-dropdown-stub">Salary Structures (Phase 4)</span>
                  <span className="nav-dropdown-stub">Salary Rules (Phase 4)</span>
                </div>
              )}
            </div>
          )}

          {canSee(user.role, 'userManagement') && (
            <Link className="nav-link" to="/users">User Management</Link>
          )}
        </nav>

        <div className="topnav-user">
          <span className="topnav-user-name">{user.employee?.name || user.email}</span>
          <span className="topnav-user-role">{user.role}</span>
          <button className="btn btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
