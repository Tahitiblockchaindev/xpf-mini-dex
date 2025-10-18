import React, { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { FEE_PROXY, WBNB, TOKENS, RPC_URL, ROUTER } from './config'
import { ERC20_ABI, ROUTER_ABI, PROXY_ABI } from './abis'
import TokenSelectModal from './components/TokenSelectModal'

const DEADLINE_MIN = 10

export default function SwapWidget() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)

  const [from, setFrom] = useState(() => TOKENS.find(t=>t.symbol==='BNB') || TOKENS[0])
  const [to, setTo] = useState(() => TOKENS.find(t=>t.symbol==='LUIA') || TOKENS[1])

  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('-')
  const [slippageMode, setSlippageMode] = useState('auto')
  const [slippage, setSlippage] = useState(0.5) // %
  const [status, setStatus] = useState('')
  const [modal, setModal] = useState(null) // 'from' | 'to' | null
  const [balFrom, setBalFrom] = useState('0')
  const [balTo, setBalTo] = useState('0')

  const rpc = useMemo(()=> new ethers.JsonRpcProvider(RPC_URL), [])

  const isNativeFrom = from.symbol === 'BNB'
  const isNativeTo   = to.symbol === 'BNB'

  const path = useMemo(()=>{
    const a = from.address
    const b = to.address
    return [a === WBNB && isNativeFrom ? WBNB : a, b === WBNB && isNativeTo ? WBNB : b]
  }, [from, to, isNativeFrom, isNativeTo])

  const connect = async () => {
    if (!window.ethereum) return alert('🦊 Installe MetaMask')
    const prov = new ethers.BrowserProvider(window.ethereum)
    await prov.send('eth_requestAccounts', [])
    const s = await prov.getSigner()
    const addr = await s.getAddress()
    const net = await prov.getNetwork()
    if (net.chainId !== 56n) alert('⚠️ Passe sur BNB Chain (56)')
    setProvider(prov); setSigner(s); setAccount(addr)
  }

  const refreshBalances = async () => {
    if (!account) return
    try {
      // From
      if (isNativeFrom) {
        const b = await (provider || rpc).getBalance(account)
        setBalFrom(ethers.formatEther(b))
      } else {
        const c = new ethers.Contract(from.address, ERC20_ABI, provider || rpc)
        const b = await c.balanceOf(account)
        setBalFrom(ethers.formatUnits(b, from.decimals || 18))
      }
      // To
      if (isNativeTo) {
        const b = await (provider || rpc).getBalance(account)
        setBalTo(ethers.formatEther(b))
      } else {
        const c = new ethers.Contract(to.address, ERC20_ABI, provider || rpc)
        const b = await c.balanceOf(account)
        setBalTo(ethers.formatUnits(b, to.decimals || 18))
      }
    } catch {}
  }
  useEffect(()=>{ refreshBalances() }, [account, from, to])

  useEffect(()=>{
    const run = async () => {
      try {
        if (!amountIn || Number(amountIn)<=0) return setAmountOut('-')
        const router = new ethers.Contract(ROUTER, ROUTER_ABI, rpc)
        const aIn = ethers.parseUnits(amountIn, from.decimals || 18)
        const out = await router.getAmountsOut(aIn, path)
        const outFinal = out[out.length-1]
        const fmt = ethers.formatUnits(outFinal, to.decimals || 18)
        setAmountOut(fmt)
      } catch {
        setAmountOut('~')
      }
    }
    run()
  }, [amountIn, from, to, path, rpc])

  const invert = () => {
    const prevFrom = from
    setFrom(to); setTo(prevFrom)
    setAmountIn('')
    setAmountOut('-')
  }

  const ensureApproval = async (tokenAddr, amountWei) => {
    const erc = new ethers.Contract(tokenAddr, ERC20_ABI, provider)
    const current = await erc.allowance(account, FEE_PROXY)
    if (current >= amountWei) return true
    const tx = await erc.connect(signer).approve(FEE_PROXY, amountWei)
    setStatus(`⏳ Approve… ${tx.hash}`)
    const rc = await tx.wait()
    return rc.status === 1n
  }

  const doSwap = async () => {
    try {
      if (!signer) return connect()
      if (!amountIn || Number(amountIn)<=0) return
      setStatus('⏳ Préparation du swap…')

      const proxy = new ethers.Contract(FEE_PROXY, PROXY_ABI, signer)
      const amountWei = ethers.parseUnits(amountIn, from.decimals || 18)
      const deadline = Math.floor(Date.now()/1000) + DEADLINE_MIN*60

      let minOut = 0n
      if (amountOut && amountOut !== '-' && amountOut !== '~') {
        const expected = ethers.parseUnits(amountOut, to.decimals || 18)
        const slip = slippageMode === 'auto' ? 50 : Math.floor((slippage*100)) // 0.5% auto
        minOut = expected - (expected * BigInt(slip) / 10_000n)
      }

      if (isNativeFrom && !isNativeTo) {
        // BNB -> Token
        const tx = await proxy.swapExactETHForTokensWithFee(
          minOut, [WBNB, to.address], account, deadline, { value: amountWei }
        )
        setStatus(`🚀 Tx envoyée: ${tx.hash}`)
        const rc = await tx.wait()
        setStatus(rc.status === 1n ? '✅ Swap réussi' : '⚠️ Non confirmé')
      } else if (!isNativeFrom && isNativeTo) {
        // Token -> BNB
        const ok = await ensureApproval(from.address, amountWei)
        if (!ok) return setStatus('❌ Approve refusée')
        const tx = await proxy.swapExactTokensForETHWithFee(
          amountWei, minOut, [from.address, WBNB], account, deadline
        )
        setStatus(`🚀 Tx envoyée: ${tx.hash}`)
        const rc = await tx.wait()
        setStatus(rc.status === 1n ? '✅ Swap réussi' : '⚠️ Non confirmé')
      } else {
        // Token -> Token
        const ok = await ensureApproval(from.address, amountWei)
        if (!ok) return setStatus('❌ Approve refusée')
        const tx = await proxy.swapExactTokensForTokensWithFee(
          amountWei, minOut, [from.address, to.address], account, deadline
        )
        setStatus(`🚀 Tx envoyée: ${tx.hash}`)
        const rc = await tx.wait()
        setStatus(rc.status === 1n ? '✅ Swap réussi' : '⚠️ Non confirmé')
      }
      setAmountIn('')
      refreshBalances()
    } catch (e) {
      console.error(e)
      setStatus('❌ ' + (e?.shortMessage || e?.message || 'Erreur'))
    }
  }

  return (
    <div className="pswap-wrapper">
      <div className="pswap-tabs">
        <button className="tab active">Swap</button>
        <button className="tab" disabled>TWAP</button>
        <button className="tab" disabled>Limit</button>
        <div className="spacer" />
        <button className="icon-btn" onClick={connect}>
          {account ? `${account.slice(0,6)}…${account.slice(-4)}` : 'Connect'}
        </button>
      </div>

      <div className="pswap-card">
        {/* FROM */}
        <div className="ps-row">
          <div className="ps-label">
            From {account ? <small>({account.slice(0,6)}…{account.slice(-4)})</small> : null}
          </div>
          <div className="ps-balance">Solde: {Number(balFrom||0).toLocaleString()}</div>
        </div>

        <div className="ps-input">
          <button className="ps-token" onClick={()=>setModal('from')}>
            <img src={from.icon || '/img/token-default.png'} onError={e=>e.target.src='/img/token-default.png'} alt="" />
            {from.symbol} ▾
          </button>
          <input type="number" placeholder="0.00" value={amountIn} onChange={e=>setAmountIn(e.target.value)} />
        </div>

        <div className="ps-swap-center">
          <button className="switch-btn" onClick={invert}>⬇︎</button>
        </div>

        {/* TO */}
        <div className="ps-row">
          <div className="ps-label">To</div>
          <div className="ps-balance">Solde: {Number(balTo||0).toLocaleString()}</div>
        </div>

        <div className="ps-input">
          <button className="ps-token" onClick={()=>setModal('to')}>
            <img src={to.icon || '/img/token-default.png'} onError={e=>e.target.src='/img/token-default.png'} alt="" />
            {to.symbol} ▾
          </button>
          <div className="ps-amount-readonly">{amountOut}</div>
        </div>

        <div className="ps-slippage">
          <a className="link" onClick={()=>setSlippageMode(m=> m==='auto' ? 'manual':'auto')}>Slippage Tolerance</a>
          <div className="slip-pill">
            {slippageMode==='auto' ? 'Auto: 0.50%' : (
              <>
                <input type="number" step="0.1" min="0" value={slippage} onChange={e=>setSlippage(parseFloat(e.target.value||'0'))} />
                <span>%</span>
              </>
            )}
          </div>
        </div>

        <button className="ps-primary" onClick={doSwap}>{account ? 'Swap' : 'Connect wallet'}</button>
        <div className="ps-status">{status}</div>
      </div>

      <TokenSelectModal
        open={!!modal}
        onClose={()=>setModal(null)}
        onSelect={(t)=>{
          if (modal==='from') setFrom(t)
          if (modal==='to') setTo(t)
        }}
      />
    </div>
  )
}
