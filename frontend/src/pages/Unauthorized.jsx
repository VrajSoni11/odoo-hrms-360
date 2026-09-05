import React from 'react';
import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="page">
      <h1>Access Denied</h1>
      <p>Your role does not have permission to view this page.</p>
      <Link to="/" className="btn btn-primary">Back to home</Link>
    </div>
  );
}
