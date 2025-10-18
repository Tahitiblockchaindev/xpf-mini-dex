import React from 'react'
import './styles.css'
import SwapBox from './components/SwapBox'

export default function App() {
  return (
    <main className="dex-container">
      <h1 style={{marginBottom: 8}}>💱 XPF Mini DEX</h1>
      <div className="badge">BSC • FeeSwapProxy</div>
      <div style={{height: 12}} />
      <SwapBox />
    </main>
  )
}
