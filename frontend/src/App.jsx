import React from 'react'
import SwapWidget from './SwapWidget'

export default function App() {
  return (
    <main style={{maxWidth: '560px', margin: '24px auto', padding: '0 12px'}}>
      <h1 style={{margin:'0 0 8px', fontSize:'22px'}}>💱 XPF Mini DEX</h1>
      <div style={{opacity:.8, fontSize:'13px', marginBottom: '12px'}}>BSC • FeeSwapProxy</div>
      <SwapWidget />
    </main>
  )
}
