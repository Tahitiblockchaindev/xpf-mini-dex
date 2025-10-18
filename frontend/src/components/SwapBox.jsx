import React, { useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { ERC20_ABI, ROUTER_ABI, PROXY_ABI } from '../abis'
import { FEE_PROXY, ROUTER, WBNB, TOKENS, RPC_URL } from '../config'

/**
 * Front minimal sans wagmi, pour simplicité & compatibilité.
 * — Connexion Metamask
 * — BNB->Token, Token->BNB, Token->Token
 * — Approve auto si nécessaire
 * — Slippage & deadline
 */

export default function SwapBox() {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)

  const [swapType, setSwapType] = useState('BNB_TO_TOKEN')
  const [fromToken, setFromToken] = useState(TOKENS[0].address)
  const [toToken, setToToken] = useState(TOKENS[0].address)

  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(1) // %
  const [status, setStatus] = useState('')

  const rpcProvider = useMemo(() => new ethers.JsonRpcProvider(RPC_URL), [])

  const connect = async () => {
    if (!window.ethereum) return setStatus('🦊 Installe Metamask.')
    const prov = new ethers.BrowserProvider(window.ethereum)
    await prov.send('eth_requestAccounts', [])
    const s = await prov.getSigner()
    const addr = await s.getAddress()
    const net = await prov.getNetwork()
    if (net.chainId !== 56n) {
      setStatus('⚠️ Bascule sur BNB Chain (56).')
    } else {
      setStatus('✅ Wallet connecté.')
    }
    setProvider(prov)
    setSigner(s)
    setAccount(addr)
  }

  const approveIfNeeded = async (tokenAddr, owner, spender, amountWei) => {
    const erc = new ethers.Contract(tokenAddr, ERC20_ABI, provider)
    const current = await erc.allowance(owner, spender)
    if (current >= amountWei) return true
    const ercW = erc.connect(signer)
    const tx = await ercW.approve(spender, amountWei)
    setStatus(`⏳ Approve en cours: ${tx.hash}`)
    const rc = await tx.wait()
    return rc.status === 1n
  }

  const getQuoteOut = async (amountInWei, path) => {
    const router = new ethers.Contract(ROUTER, ROUTER_ABI, rpcProvider)
    const out = await router.getAmountsOut(amountInWei, path)
    return out[out.length - 1]
  }

  const handleSwap = async () => {
    try {
      if (!signer) { await connect(); if (!signer) return }
      const amt = parseFloat(amount || '0')
      if (amt <= 0) return setStatus('⛽ Saisis un montant > 0')

      const proxy = new ethers.Contract(FEE_PROXY, PROXY_ABI, provider).connect(signer)
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10

      if (swapType === 'BNB_TO_TOKEN') {
        const amountInWei = ethers.parseEther(amt.toString())
        const path = [WBNB, toToken]
        const expected = await getQuoteOut(amountInWei, path)
        const minOut = expected - (expected * BigInt(Math.floor(slippage * 100)) / 10000n)
        setStatus('⏳ Envoi du swap BNB → Token...')
        const tx = await proxy.swapExactETHForTokensWithFee(
          minOut, path, account, deadline, { value: amountInWei }
        )
        setStatus(`🚀 Tx envoyée: ${tx.hash}`)
        const rc = await tx.wait()
        setStatus(rc.status === 1n ? '✅ Swap réussi' : '⚠️ Non confirmé')
      }

      if (swapType === 'TOKEN_TO_BNB') {
        const amtWei = ethers.parseEther(amt.toString())
        const path = [fromToken, WBNB]
        const expected = await getQuoteOut(amtWei, path)
        const minOut = expected - (expected * BigInt(Math.floor(slippage * 100)) / 10000n)
        const ok = await approveIfNeeded(fromToken, account, FEE_PROXY, amtWei)
        if (!ok) return setStatus('❌ Approve refusée.')
        setStatus('⏳ Envoi du swap Token → BNB...')
        const tx = await proxy.swapExactTokensForETHWithFee(
          amtWei, minOut, path, account, deadline
        )
        setStatus(`🚀 Tx envoyée: ${tx.hash}`)
        const rc = await tx.wait()
        setStatus(rc.status === 1n ? '✅ Swap réussi' : '⚠️ Non confirmé')
      }

      if (swapType === 'TOKEN_TO_TOKEN') {
        if (fromToken.toLowerCase() === toToken.toLowerCase()) {
          return setStatus('⚠️ Sélectionne deux tokens différents.')
        }
        const amtWei = ethers.parseEther(amt.toString())
        const path = [fromToken, toToken]
        const expected = await getQuoteOut(amtWei, path)
        const minOut = expected - (expected * BigInt(Math.floor(slippage * 100)) / 10000n)
        const ok = await approveIfNeeded(fromToken, account, FEE_PROXY, amtWei)
        if (!ok) return setStatus('❌ Approve refusée.')
        setStatus('⏳ Envoi du swap Token → Token...')
        const tx = await proxy.swapExactTokensForTokensWithFee(
          amtWei, minOut, path, account, deadline
        )
        setStatus(`🚀 Tx envoyée: ${tx.hash}`)
        const rc = await tx.wait()
        setStatus(rc.status === 1n ? '✅ Swap réussi' : '⚠️ Non confirmé')
      }
    } catch (e) {
      console.error(e)
      setStatus('❌ ' + (e?.shortMessage || e?.message || 'Erreur'))
    }
  }

  return (
    <div className="swap-card">
      <div className="row">
        <div className="col">
          <div className="badge">Type de swap</div>
          <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap'}}>
            <button className="btn" onClick={()=>setSwapType('BNB_TO_TOKEN')}>BNB → Token</button>
            <button className="btn" onClick={()=>setSwapType('TOKEN_TO_BNB')}>Token → BNB</button>
            <button className="btn" onClick={()=>setSwapType('TOKEN_TO_TOKEN')}>Token → Token</button>
          </div>
        </div>
        <div className="col" style={{textAlign:'right'}}>
          <button className="btn" onClick={connect}>
            {account ? `Connecté: ${account.slice(0,6)}...${account.slice(-4)}` : '🔌 Connecter le wallet'}
          </button>
        </div>
      </div>

      <div style={{height:12}} />

      {swapType !== 'BNB_TO_TOKEN' && (
        <>
          <div className="badge">From (token)</div>
          <select className="select" onChange={e=>setFromToken(e.target.value)} value={fromToken}>
            {TOKENS.map(t => <option key={t.address} value={t.address}>{t.symbol}</option>)}
          </select>
          <div style={{height:10}} />
        </>
      )}

      {swapType !== 'TOKEN_TO_BNB' && (
        <>
          <div className="badge">To (token)</div>
          <select className="select" onChange={e=>setToToken(e.target.value)} value={toToken}>
            {TOKENS.map(t => <option key={t.address} value={t.address}>{t.symbol}</option>)}
          </select>
          <div style={{height:10}} />
        </>
      )}

      <div className="badge">Montant {swapType==='BNB_TO_TOKEN' ? '(BNB)' : '(token source)'}</div>
      <input className="input" type="number" min="0" step="0.000001" placeholder="0.01" value={amount} onChange={e=>setAmount(e.target.value)} />

      <div className="row" style={{marginTop:10}}>
        <div className="col">
          <div className="badge">Slippage (%)</div>
          <input className="input" type="number" min="0" step="0.1" value={slippage} onChange={e=>setSlippage(parseFloat(e.target.value||'0'))} />
        </div>
        <div className="col">
          <div className="badge">Deadline (10 min par défaut)</div>
          <input className="input" value="Auto" disabled />
        </div>
      </div>

      <div style={{height:12}} />
      <button className="btn" onClick={handleSwap} disabled={!account}>💱 Swap</button>
      <div className="status">{status}</div>
    </div>
  )
}
