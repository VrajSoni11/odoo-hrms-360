import React, { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AttendanceWidget from "./AttendanceWidget.jsx";
import {
  CalendarRange,
  ChevronDown,
  Clock,
  LogOut,
  Menu,
  ShieldCheck,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";

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

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavLink({ to, icon: Icon, label, collapsed, active }) {
  return (
    <Link to={to} className={`sidebar-link${active ? " active" : ""}`}>
      <Icon size={17} strokeWidth={2} />
      <span className="sidebar-link-label">{label}</span>
      {collapsed && <span className="sidebar-tooltip">{label}</span>}
    </Link>
  );
}

function NavGroup({ icon: Icon, label, collapsed, children, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div>
      <button
        type="button"
        className={`sidebar-link-btn${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon size={17} strokeWidth={2} />
        <span className="sidebar-link-label">{label}</span>
        <ChevronDown size={15} className="sidebar-chevron" />
        {collapsed && <span className="sidebar-tooltip">{label}</span>}
      </button>
      {open && !collapsed && <div className="sidebar-submenu">{children}</div>}
    </div>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;
  const isUnder = (prefix) => location.pathname.startsWith(prefix);

  const displayName = user.employee?.name || user.email;

  return (
    <div className="app-shell">
      <div
        className={`mobile-overlay${mobileOpen ? " open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">P360</div>
          <div className="sidebar-brand-text">
            PeoplePay360
            <small>HR &amp; Payroll</small>
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Menu size={16} /> : <X size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {canSee(user.role, "employees") && (
            <>
              <div className="sidebar-section-label">Workforce</div>
              <NavGroup icon={Users} label="Employees" collapsed={collapsed} defaultOpen={isUnder("/employees")}>
                <Link className="sidebar-link" to="/employees">Employees</Link>
                <Link className="sidebar-link" to="/departments">Departments</Link>
                <Link className="sidebar-link" to="/schedules">Working Schedules</Link>
                <Link className="sidebar-link" to="/contracts">Contracts</Link>
              </NavGroup>
            </>
          )}

          <div className="sidebar-section-label">{collapsed ? "•" : "Time"}</div>
          <NavLink to="/attendance" icon={Clock} label="Attendance" collapsed={collapsed} active={isActive("/attendance")} />

          {canSee(user.role, "timeOff") && (
            <NavGroup icon={CalendarRange} label="Time Off" collapsed={collapsed} defaultOpen={isUnder("/time-off")}>
              <Link className="sidebar-link" to="/time-off/my-requests">My Requests</Link>
              {canSee(user.role, "employees") && (
                <>
                  <Link className="sidebar-link" to="/time-off/approvals">Approvals</Link>
                  <Link className="sidebar-link" to="/time-off/allocations">Allocations</Link>
                  <Link className="sidebar-link" to="/time-off/types">Time Off Types</Link>
                </>
              )}
            </NavGroup>
          )}

          {canSee(user.role, "payroll") && (
            <>
              <div className="sidebar-section-label">{collapsed ? "•" : "Finance"}</div>
              <NavGroup icon={Wallet} label="Payroll" collapsed={collapsed} defaultOpen={isUnder("/payroll")}>
                <Link className="sidebar-link" to="/payroll/dashboard">Dashboard</Link>
                <Link className="sidebar-link" to="/payroll/payruns">Payruns</Link>
                <Link className="sidebar-link" to="/payroll/salary-structures">Salary Structures</Link>
                {user.role === "Admin" && (
                  <Link className="sidebar-link" to="/payroll/salary-rules">Salary Rules</Link>
                )}
                <Link className="sidebar-link" to="/payroll/payslips">Payslips</Link>
              </NavGroup>
            </>
          )}

          {canSee(user.role, "userManagement") && (
            <>
              <div className="sidebar-section-label">{collapsed ? "•" : "Administration"}</div>
              <NavLink to="/users" icon={ShieldCheck} label="User Management" collapsed={collapsed} active={isActive("/users")} />
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/my-profile" icon={User} label="My Profile" collapsed={collapsed} active={isActive("/my-profile")} />
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button
            type="button"
            className="topbar-menu-btn"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <Menu size={18} />
          </button>

          <div className="topbar-title">
            {breadcrumbFor(location.pathname)}
          </div>

          <div className="topbar-spacer" />

          <div className="topbar-actions">
            {user.employee && <AttendanceWidget />}

            <div className="topbar-user" ref={menuRef}>
              <button
                type="button"
                className="topbar-user-trigger"
                onClick={() => setUserMenuOpen((o) => !o)}
              >
                <div className="avatar">{initials(displayName)}</div>
                <div className="topbar-user-meta">
                  <div className="topbar-user-name">{displayName}</div>
                  <div className="topbar-user-role">{user.role}</div>
                </div>
                <ChevronDown size={15} color="var(--text-faint)" />
              </button>

              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <span className="topbar-user-name">{displayName}</span>
                    <div className="topbar-user-role">{user.email}</div>
                  </div>
                  <Link
                    className="user-dropdown-item"
                    to="/my-profile"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User size={16} /> My Profile
                  </Link>
                  <button
                    className="user-dropdown-item danger"
                    type="button"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function breadcrumbFor(pathname) {
  const map = [
    { prefix: "/employees", label: "Employees" },
    { prefix: "/departments", label: "Departments" },
    { prefix: "/schedules", label: "Working Schedules" },
    { prefix: "/contracts", label: "Contracts" },
    { prefix: "/attendance", label: "Attendance" },
    { prefix: "/time-off", label: "Time Off" },
    { prefix: "/payroll", label: "Payroll" },
    { prefix: "/users", label: "User Management" },
    { prefix: "/my-profile", label: "My Profile" },
  ];
  const match = map.find((m) => pathname.startsWith(m.prefix));
  return match ? match.label : "Dashboard";
}
