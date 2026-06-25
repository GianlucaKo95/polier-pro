ARG BUILD_FROM=ghcr.io/hassio-addons/base:latest
FROM ${BUILD_FROM}

# Node.js + nginx
RUN apk add --no-cache nodejs npm nginx

# App bauen
WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
RUN npm run build && cp -r dist/* /var/www/html/ && rm -rf node_modules dist

# nginx Konfig
COPY rootfs/ /

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
