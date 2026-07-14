ARG BUILD_FROM=ghcr.io/home-assistant/base:latest
FROM ${BUILD_FROM}

RUN apk add --no-cache nodejs npm nginx

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .

# Supabase-Zugangsdaten werden als Build-Argumente übergeben (aus GitHub
# Actions Secrets, siehe .github/workflows/build.yml) und hier zur
# Build-Zeit in eine .env geschrieben. Die .env selbst landet NIE im Git-
# Repo und NICHT im finalen Image-Layer über COPY . . hinaus — sie wird
# nur für den einen "npm run build"-Schritt gebraucht, Vite bündelt die
# Werte danach fest in die statischen JS-Dateien.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env

RUN npm run build

RUN mkdir -p /var/www/html && cp -r dist/* /var/www/html/ && rm -rf node_modules dist .env

RUN mkdir -p /etc/services.d/nginx
COPY rootfs/ /
RUN chmod a+x /etc/services.d/nginx/run /etc/services.d/nginx/finish
