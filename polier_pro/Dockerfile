ARG BUILD_FROM=ghcr.io/home-assistant/base:latest
FROM ${BUILD_FROM}

RUN apk add --no-cache nginx

RUN mkdir -p /var/www/html/assets
COPY static/index.html /var/www/html/index.html
COPY static/polaris-app.js /var/www/html/assets/polaris-app.js

RUN mkdir -p /etc/services.d/nginx
COPY rootfs/ /
RUN chmod a+x /etc/services.d/nginx/run /etc/services.d/nginx/finish
