// Where the backend lives.
// - Development: leave VITE_API_URL unset. Vite proxies /api and /uploads to localhost:5000.
// - Production: set VITE_API_URL to the deployed backend, e.g. https://myrentpal-api.onrender.com
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// Turns a server path such as /uploads/abc.jpg into a URL the browser can load.
export const assetUrl = (path) => `${API_URL}${path}`
