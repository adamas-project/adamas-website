# syntax=docker/dockerfile:1

# ---- Build stage: compile the server and bundle the web client ----
# node_modules is provided from the build context (installed with `npm install`
# on the host) to avoid running npm inside the build sandbox. `npm ci` works in
# normal CI environments; swap the COPY for `RUN npm ci` there if preferred.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY node_modules ./node_modules
COPY tsconfig.json tsconfig.web.json vite.config.ts ./
COPY src ./src
COPY web ./web
RUN npm run build

# ---- Runtime stage ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    ADAMAS_HOST=0.0.0.0 \
    ADAMAS_PORT=8787 \
    ADAMAS_VAULT=/data/vault
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/web-dist ./web-dist
COPY package.json ./

# The vault is a mounted volume; canonical data lives on the host, never baked in.
RUN mkdir -p /data/vault
VOLUME ["/data/vault"]

EXPOSE 8787
# Local-first: only this single app port is exposed; no inbound ports otherwise.
HEALTHCHECK --interval=30s --timeout=4s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.ADAMAS_PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
