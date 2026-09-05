import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="page">
      <h2>Access Restricted</h2>
      <p>Your role does not have permission to view this page.</p>
      <Link to="/">Go back home</Link>
    </div>
  );
}
