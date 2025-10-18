// Config BSC / App
export const FEE_PROXY = "0x93DD94bE38d9501Fba10769B773156Bb841424F4";
export const RPC_URL   = "https://bsc-dataseed.binance.org";
export const ROUTER    = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
export const WBNB      = "0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

export const TOKENS = [
  { symbol: "BNB",  address: WBNB, decimals: 18, icon: "https://assets.pancakeswap.finance/web/chains/56.png" },
  { symbol: "LUIA", address: "0x5b52e9772a3227dbb6ff13e794beccff46adc07c", decimals: 18, icon: "/img/luia.png" },
  { symbol: "BUSD", address: "0xe9e7cea3dedca5984780bafc599bd69add087d56", decimals: 18,
    icon: "https://assets.pancakeswap.finance/web/tokens/56/0xe9e7cea3dedca5984780bafc599bd69add087d56.png" }
];

// Backend base URL (can be overridden by .env VITE_DEX_API_BASE if your widget calls an API)
export const API_BASE = import.meta.env?.VITE_DEX_API_BASE || "https://swap.xpfcryptoprice.xyz";
