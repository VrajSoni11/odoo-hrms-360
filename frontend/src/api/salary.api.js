import client from './client';

export const getSalaryStructures = () => client.get('/salary-structures');
export const getSalaryStructure = (id) => client.get(`/salary-structures/${id}`);
export const createSalaryStructure = (data) => client.post('/salary-structures', data);
export const updateSalaryStructure = (id, data) => client.put(`/salary-structures/${id}`, data);
export const deleteSalaryStructure = (id) => client.delete(`/salary-structures/${id}`);
export const getSalaryRules = (structureId) => client.get('/salary-rules', { params: { structureId } });
export const createSalaryRule = (data) => client.post('/salary-rules', data);
export const updateSalaryRule = (id, data) => client.put(`/salary-rules/${id}`, data);
export const deleteSalaryRule = (id) => client.delete(`/salary-rules/${id}`);
export const previewSalary = (structureId, sampleWage) => client.post('/salary-rules/preview', { structureId, sampleWage });
