ARG BUILD_FROM=ghcr.io/hassio-addons/base:latest
FROM ${BUILD_FROM}

# Node.js für Build-Step
RUN apk add --no-cache nodejs npm nginx

# App-Quellen kopieren
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install

COPY . .

# Produktions-Build
RUN npm run build

# Build-Output nach nginx-Root kopieren
RUN cp -r dist/* /var/www/html/ && \
    rm -rf node_modules

# nginx-Konfiguration
COPY ha-addon/rootfs/ /

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
