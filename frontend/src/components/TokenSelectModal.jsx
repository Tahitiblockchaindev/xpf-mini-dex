import React, { useMemo, useState } from "react";
import { ethers } from "ethers";
import { TOKENS, RPC_URL } from "../config";
import { ERC20_ABI } from "../abis";

export default function TokenSelectModal({ open, onClose, onSelect }) {
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState("");
  const [list, setList] = useState(TOKENS);

  const filtered = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(t =>
      t.symbol.toLowerCase().includes(q) ||
      t.address.toLowerCase().includes(q)
    );
  }, [search, list]);

  const addCustom = async () => {
    try {
      const addr = custom.trim();
      if (!ethers.isAddress(addr)) throw new Error("Adresse invalide");
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const c = new ethers.Contract(addr, ERC20_ABI, provider);
      const [symbol, decimals] = await Promise.all([c.symbol(), c.decimals()]);
      const t = { symbol, address: addr, decimals, icon: "" };
      setList(prev => prev.find(p => p.address.toLowerCase() === addr.toLowerCase()) ? prev : [...prev, t]);
      setCustom("");
      alert(`✅ ${symbol} ajouté`);
    } catch (e) {
      alert(e.message || "Impossible d’ajouter ce token");
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>Sélectionner un token</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <input className="input" placeholder="Rechercher symbole ou adresse…" value={search} onChange={e=>setSearch(e.target.value)} />
        <ul className="token-list">
          {filtered.map(t => (
            <li key={t.address} onClick={() => {onSelect(t); onClose();}}>
              <img src={t.icon || '/img/token-default.png'} onError={e=>e.target.src='/img/token-default.png'} alt="" />
              <div>
                <b>{t.symbol}</b>
                <small>{t.address.slice(0,6)}…{t.address.slice(-4)}</small>
              </div>
            </li>
          ))}
        </ul>
        <div className="custom-add">
          <input className="input" placeholder="Adresse du token (0x…)" value={custom} onChange={e=>setCustom(e.target.value)} />
          <button className="btn" onClick={addCustom}>➕ Ajouter</button>
        </div>
      </div>
    </div>
  );
}
