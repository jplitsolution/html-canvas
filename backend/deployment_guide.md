# 🚀 TemplateCraft Deployment Guide

## Server Details
| Item | Value |
|---|---|
| **Server IP** | `103.131.24.113` |
| **OS** | AlmaLinux |
| **Code Path** | `/softwere/html-canvas` |
| **Backend Port** | `3001` |
| **Frontend Port** | `8080` |
| **Elasticsearch** | `127.0.0.1:9200` (Docker, localhost only) |

---

## Option 1: Quick Deploy (One Command)

SSH into server and run deploy script:

```bash
ssh root@103.131.24.113
cd /softwere/html-canvas
./deploy.sh all
```

`deploy.sh all` does everything:
1. ✅ Git pull
2. ✅ Write `.env` files
3. ✅ Backend npm install + build
4. ✅ Frontend npm install + build
5. ✅ Elasticsearch Docker start
6. ✅ PM2 reload

---

## Option 2: Step-by-Step Manual Deploy

### Step 1: SSH into server
```bash
ssh root@103.131.24.113
cd /softwere/html-canvas
```

### Step 2: Pull latest code
```bash
git fetch origin
git reset --hard origin/main
```

### Step 3: Install dependencies
```bash
# Backend
cd backend
npm install

# Frontend (HUSKY=0 zaroori hai — husky server pe fail hota hai)
cd ../frontend
HUSKY=0 npm install
cd ..
```

### Step 4: Start / Restart PM2
```bash
# Pehli baar (ya fresh start):
pm2 delete all
export FRONTEND_PORT=8080
pm2 start ecosystem.config.cjs
pm2 save

# Baad me (already running ho):
pm2 reload all
```

> [!IMPORTANT]
> `pm2 start` internally `start.sh` run karta hai jo pehle **build** karta hai. Agar build fail hua to app start nahi hoga.

### Step 5: Check status
```bash
pm2 list                  # Sab online hai?
pm2 logs --lines 20       # Koi error to nahi?
```

---

## Useful Commands Cheat Sheet

| Task | Command |
|---|---|
| **SSH into server** | `ssh root@103.131.24.113` |
| **Full deploy** | `cd /softwere/html-canvas && ./deploy.sh all` |
| **Only apps (no Docker)** | `./deploy.sh apps` |
| **Only Docker (ES)** | `./deploy.sh docker` |
| **PM2 status** | `pm2 list` |
| **PM2 logs (live)** | `pm2 logs` |
| **PM2 restart all** | `pm2 reload all` |
| **PM2 stop all** | `pm2 stop all` |
| **PM2 restart backend** | `pm2 reload templatecraft-api` |
| **PM2 restart frontend** | `pm2 reload templatecraft-web` |
| **ES backfill (purana data)** | `cd backend && node scripts/reindex-logs.mjs` |
| **ES check** | `curl http://127.0.0.1:9200/_cat/indices?v` |
| **Backend .env dekho** | `cat backend/.env` |

---

## deploy.sh Sub-Commands

```bash
./deploy.sh all      # Docker + Apps (full deploy)
./deploy.sh apps     # Only Backend + Frontend (build + PM2 reload)
./deploy.sh docker   # Only Elasticsearch Docker container
```

---

## Troubleshooting

### Build fail hua?
```bash
pm2 logs --lines 50    # Error dekho
pm2 list               # Status "errored" dikha raha?

# Fix karo, phir:
pm2 reload all
```

### Purana data Elasticsearch me nahi dikh raha?
```bash
cd /softwere/html-canvas/backend
node scripts/reindex-logs.mjs    # MySQL se ES me backfill
```

### Elasticsearch down hai?
```bash
cd /softwere/html-canvas/backend
docker compose up -d
```

### Server reboot ke baad PM2 auto-start setup
```bash
sudo env PATH=$PATH pm2 startup systemd -u root --hp /root
pm2 save
```

---

## Config Files

| File | Purpose |
|---|---|
| [deploy.env](file:///Users/abhinavvishwakarma/work/JPL/wapManager/html-canvas/deploy.env) | Server config (DB, ports, JWT, etc.) |
| [deploy.sh](file:///Users/abhinavvishwakarma/work/JPL/wapManager/html-canvas/deploy.sh) | Main deploy script |
| [ecosystem.config.cjs](file:///Users/abhinavvishwakarma/work/JPL/wapManager/html-canvas/ecosystem.config.cjs) | PM2 process definitions |
| [backend/start.sh](file:///Users/abhinavvishwakarma/work/JPL/wapManager/html-canvas/backend/start.sh) | Backend build + start wrapper |
| [frontend/start.sh](file:///Users/abhinavvishwakarma/work/JPL/wapManager/html-canvas/frontend/start.sh) | Frontend build + start wrapper |
| [backend/docker-compose.yml](file:///Users/abhinavvishwakarma/work/JPL/wapManager/html-canvas/backend/docker-compose.yml) | Elasticsearch Docker config |