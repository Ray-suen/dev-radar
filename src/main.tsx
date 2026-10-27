import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RadarPage } from './components/RadarPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RadarPage />
  </StrictMode>,
)
