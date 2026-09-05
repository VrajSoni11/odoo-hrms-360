import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HR_MANAGE_ROLES, PAYROLL_ROLES, ADMIN_ONLY } from '../constants/roles';

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const canSeeHR = HR_MANAGE_ROLES.includes(user.role);
  const canSeePayroll = PAYROLL_ROLES.includes(user.role);
  const isAdmin = ADMIN_ONLY.includes(user.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">PeoplePay360</div>

        <nav className="app-nav">
          {canSeeHR ? (
            <div className="nav-dropdown">
              <span className="nav-item">Employees ▾</span>
              <div className="nav-dropdown-menu">
                <NavLink to="/employees">Employees</NavLink>
                <NavLink to="/departments">Departments</NavLink>
                <span className="nav-item-disabled">Contracts (Phase 1)</span>
                <span className="nav-item-disabled">Working Schedule (Phase 1)</span>
              </div>
            </div>
          ) : (
            <NavLink to="/my-profile" className="nav-item">
              My Profile
            </NavLink>
          )}

          <NavLink to="/attendance" className="nav-item">
            Attendance
          </NavLink>

          <div className="nav-dropdown">
            <span className="nav-item">Time Off ▾</span>
            <div className="nav-dropdown-menu">
              <span className="nav-item-disabled">Dashboard (Phase 3)</span>
              <span className="nav-item-disabled">Requests (Phase 3)</span>
              <span className="nav-item-disabled">Time Off Types (Phase 3)</span>
              <span className="nav-item-disabled">Allocations (Phase 3)</span>
            </div>
          </div>

          {canSeePayroll && (
            <div className="nav-dropdown">
              <span className="nav-item">Payroll ▾</span>
              <div className="nav-dropdown-menu">
                <span className="nav-item-disabled">Dashboard (Phase 7)</span>
                <span className="nav-item-disabled">Payruns (Phase 5)</span>
                <span className="nav-item-disabled">Payslips (Phase 5)</span>
                <span className="nav-item-disabled">Salary Structures (Phase 4)</span>
                <span className="nav-item-disabled">Salary Rules (Phase 4)</span>
              </div>
            </div>
          )}

          {isAdmin && (
            <NavLink to="/users" className="nav-item">
              User Management
            </NavLink>
          )}
        </nav>

        <div className="app-user">
          <span className="app-user-name">
            {user.employee ? user.employee.name : user.email}
          </span>
          <span className="app-user-role">{user.role}</span>
          <button onClick={handleLogout} className="logout-btn">
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
