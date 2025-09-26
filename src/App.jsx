import React from 'react'
import Sheet from './components/Sheet.jsx'

export default function App() {
  return (
    <div className="app">
      <div className="sheet-container">
        <h1 style={{marginTop: 0}}>Tabla tipo Google Sheet</h1>
        <p>Campos: Company, Fecha de celebración, Status, KDM, Título del KDM, Industria, # Empleados, Score.</p>
        <Sheet />
      </div>
    </div>
  )
}
