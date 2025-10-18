# XPF Swap Frontend (React + Vite)

Ce projet contient le widget React "Mini DEX" pour `swap.xpfcryptoprice.xyz`.
Le build est **automatiquement** exporté dans `../backend/dist` pour être servi par ton backend Express (port 3002).

## 1) Configuration
- `src/config.js` contient les adresses BSC :
  - `FEE_PROXY = 0x93DD94bE38d9501Fba10769B773156Bb841424F4`
  - `ROUTER`, `WBNB`, `TOKENS`
- `.env` définit l'URL backend exposée (par défaut `https://swap.xpfcryptoprice.xyz`).

## 2) Installation / Build (sur VPS)
```bash
cd /var/www/xpf-mini-dex
# déposer ce dossier sous: /var/www/xpf-mini-dex/xpf-swap-frontend

cd xpf-swap-frontend
npm install
npm run build
# -> le build est sorti dans ../backend/dist
pm2 restart xpf-mini-dex
```

## 3) Nginx
Assure-toi d'avoir la conf :
```
server {
    listen 80;
    server_name swap.xpfcryptoprice.xyz;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name swap.xpfcryptoprice.xyz;
    ssl_certificate /etc/letsencrypt/live/swap.xpfcryptoprice.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/swap.xpfcryptoprice.xyz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 4) Intégration sur ton site (iframe)
```html
<iframe 
  src="https://swap.xpfcryptoprice.xyz"
  style="width:100%;max-width:420px;height:720px;border:0;border-radius:16px"
  loading="lazy"></iframe>
```

## 5) Notes
- Utilise MetaMask sur BNB Chain (chainId 56)
- Le proxy de swap prélève ta commission et route via PancakeSwap V2
- Le slippage "Auto" est à 0.50% par défaut
