import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'
import axios from 'axios'
import { API_URL } from './lib/api'

axios.defaults.baseURL = API_URL

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
  </React.StrictMode>,
)
