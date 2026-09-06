import client from './client';

// Paginated by default (15/page from the backend). Pass { all: true } to
// get every employee back as a plain array — used by dropdowns/selects
// elsewhere that need the full roster rather than one page of it.
export const getEmployees = (params = {}) => client.get('/employees', { params });
