export const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)"
];

export const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)"
];

export const PROXY_ABI = [
  "function swapExactETHForTokensWithFee(uint amountOutMin, address[] path, address to, uint deadline) payable",
  "function swapExactTokensForETHWithFee(uint amountIn,uint amountOutMin,address[] path,address to,uint deadline)",
  "function swapExactTokensForTokensWithFee(uint amountIn,uint amountOutMin,address[] path,address to,uint deadline)"
];
