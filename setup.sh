#!/bin/bash
set -e

echo "Creating Nginx Config..."
cat << 'NGINX_EOF' > /etc/nginx/conf.d/html-canvas.conf
server {
    listen 443 ssl;
    server_name 103.131.24.113;

    ssl_certificate /etc/ssl/certs/html-canvas-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/html-canvas-selfsigned.key;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_EOF

echo "Updating frontend env..."
sed -i 's|http://103.131.24.113:3001/api|https://103.131.24.113/api|g' /softwere/html-canvas/frontend/.env.production

echo "Checking Nginx syntax..."
nginx -t

echo "Reloading Nginx..."
systemctl reload nginx

echo "Restarting PM2 Frontend (this will rebuild it)..."
cd /softwere/html-canvas/frontend
pm2 restart templatecraft-web
