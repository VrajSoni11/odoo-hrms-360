import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="page">
      <div className="empty-state" style={{ marginTop: 40 }}>
        <div className="empty-state-icon"><ShieldAlert size={22} strokeWidth={1.75} /></div>
        <div className="empty-state-title">Access Denied</div>
        <div className="empty-state-desc">Your role does not have permission to view this page.</div>
        <div style={{ marginTop: 18 }}>
          <Link to="/" className="btn btn-primary">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
