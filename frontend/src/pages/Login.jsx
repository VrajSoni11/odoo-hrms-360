import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AlertCircle, BarChart3, CalendarCheck2, ShieldCheck, Wallet } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-branding">
        <div className="login-branding-top">
          <div className="sidebar-brand-mark">
            <img src="/logo.png" alt="PeoplePay360 logo" />
          </div>
          <div className="sidebar-brand-text">
            PeoplePay360
            <small>HR &amp; Payroll</small>
          </div>
        </div>

        <div className="login-branding-mid">
          <h2>One platform for people, time and pay.</h2>
          <p>
            Manage employees, attendance, time off and payroll from a single,
            secure workspace built for modern HR teams.
          </p>
          <ul className="login-branding-features">
            <li><ShieldCheck size={17} /> Role-based access &amp; audit-ready records</li>
            <li><CalendarCheck2 size={17} /> Streamlined attendance &amp; leave approvals</li>
            <li><Wallet size={17} /> Accurate, automated payroll processing</li>
            <li><BarChart3 size={17} /> Real-time HR &amp; payroll analytics</li>
          </ul>
        </div>

        <div className="login-branding-foot">© {new Date().getFullYear()} PeoplePay360. All rights reserved.</div>
      </div>

      <div className="login-form-side">
        <div className="login-card">
          <h1>Welcome back</h1>
          <p className="login-subtitle">Sign in to your HR portal to continue</p>

          <form onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && (
              <div className="form-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="login-hint">
            Seeded logins (password: <code>Password@123</code>)
            <ul>
              <li>admin@peoplepay360.demo</li>
              <li>hrmanager@peoplepay360.demo</li>
              <li>payrolluser@peoplepay360.demo</li>
              <li>payrollmanager@peoplepay360.demo</li>
              <li>employee@peoplepay360.demo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
