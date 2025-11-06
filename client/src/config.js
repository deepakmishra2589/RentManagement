// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Other app configurations can be added here
export const APP_CONFIG = {
  appName: 'Rent Management System',
  defaultPageSize: 10,
  dateFormat: 'YYYY-MM-DD',
  dateTimeFormat: 'YYYY-MM-DD HH:mm',
  // Add more configuration as needed
};

// Export all config values
export default {
  API_BASE_URL,
  ...APP_CONFIG
};
