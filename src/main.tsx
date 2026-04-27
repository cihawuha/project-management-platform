import './lib/sentry'
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './lib/toast'
import { ErrorFallback } from './components/error-fallback'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </Sentry.ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)
