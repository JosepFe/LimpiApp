# LimpiApp web: Angular build with Node, served by nginx, which also forwards /api to the API (E01/US-005).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# «build 2026.10.29» in Ajustes: the day the image was built.
RUN npx ng build --define "LIMPIAPP_BUILD='$(date +%Y.%m.%d)'"

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/limpiapp/browser /usr/share/nginx/html
