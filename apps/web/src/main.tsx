// =============================================================================
// FILE:    apps/web/src/main.tsx
// PURPOSE: Browser entry point: mounts the React application into index.html.
// USED BY: apps/web/index.html (module script)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApplicationRoot } from './app/application-root'

// ---- Mounting ---------------------------------------------------------------

const applicationContainer = document.getElementById('application-root')

// Fail loudly instead of rendering nothing — a missing container means the
// HTML and the script have drifted apart.
if (!applicationContainer) {
  throw new Error('Missing #application-root element in index.html')
}

createRoot(applicationContainer).render(
  <StrictMode>
    <ApplicationRoot />
  </StrictMode>,
)
