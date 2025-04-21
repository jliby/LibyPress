import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Conditionally start MSW
async function startApp() {
  if (process.env.NODE_ENV === 'development') {
    const { worker } = await import('./mocks/browser')
    // Start the worker
    await worker.start({
      onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
    })
  }

  const root = ReactDOM.createRoot(document.getElementById('root'))
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

startApp() 