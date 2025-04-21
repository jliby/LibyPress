import { setupWorker } from 'msw'
import { handlers } from './handlers'

// Create the worker instance
export const worker = setupWorker(...handlers)

// Initialize MSW only in development mode
if (process.env.NODE_ENV === 'development') {
  console.log('Mock Service Worker enabled in development mode')
} 