// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getApiUrl = (path: string): string => {
  // In development, use relative paths so Vite proxy can intercept
  // In production, use full URL
  if (import.meta.env.DEV) {
    // Return relative path for Vite proxy to handle
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  // Production: use full URL
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

export default API_BASE_URL;
