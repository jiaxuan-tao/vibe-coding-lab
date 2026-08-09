import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // updateViaCache:'none' makes the browser re-check sw.js on every
    // navigation, so clients stuck on a stale worker recover after a deploy.
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
