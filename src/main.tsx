import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { EmpresaProvider } from './context/EmpresaContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EmpresaProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </EmpresaProvider>
  </StrictMode>,
)
