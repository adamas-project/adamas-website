# syntax=docker/dockerfile:1

# ---- Build stage: compile the server and bundle the web client ----
# Self-contained: a fresh `git clone` + `docker compose up --build` just works,
# no host-side `npm install` required.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.web.json vite.config.ts ./
COPY src ./src
COPY web ./web
RUN npm run build
# Drop dev dependencies so the runtime image only carries what it needs.
RUN npm prune --omit=dev

# ---- Whisper stage: build whisper.cpp (static) + fetch a base model ----
# This is what makes "drop a recording" work out of the box (on-device, CPU).
# It's a heavy one-time build; first `docker compose up --build` will take a few
# minutes and download ~140MB. Override the model with ADAMAS_WHISPER_MODEL.
FROM node:22-bookworm-slim AS whisper
RUN apt-get update && apt-get install -y --no-install-recommends \
      git build-essential cmake ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /opt
RUN git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git
WORKDIR /opt/whisper.cpp
# Static build so the single binary is self-contained in the runtime image.
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON \
  && cmake --build build -j --config Release \
  && cp build/bin/whisper-cli /usr/local/bin/whisper-cli
RUN mkdir -p /models \
  && curl -fsSL -o /models/ggml-base.en.bin \
       https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin

# ---- Runtime stage ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    ADAMAS_HOST=0.0.0.0 \
    ADAMAS_PORT=8787 \
    ADAMAS_VAULT=/data/vault \
    ADAMAS_WHISPER_MODEL=/models/ggml-base.en.bin \
    ADAMAS_TRANSCRIBE_CMD="adamas-transcribe {input}"
WORKDIR /app

# ffmpeg decodes common audio/video formats; whisper.cpp (baked in below) does the
# speech-to-text. Both run on-device — nothing leaves the machine.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# On-device speech-to-text: the whisper.cpp binary, a base model, and a wrapper
# that normalizes any audio/video to 16kHz WAV (ffmpeg) then transcribes to stdout.
COPY --from=whisper /usr/local/bin/whisper-cli /usr/local/bin/whisper-cli
COPY --from=whisper /models /models
RUN printf '%s\n' \
      '#!/bin/sh' \
      'set -e' \
      'in="$1"' \
      'wav="$(mktemp).wav"' \
      'ffmpeg -nostdin -loglevel error -y -i "$in" -ar 16000 -ac 1 -f wav "$wav"' \
      'whisper-cli -m "${ADAMAS_WHISPER_MODEL:-/models/ggml-base.en.bin}" -f "$wav" -nt 2>/dev/null' \
      'rm -f "$wav"' \
    > /usr/local/bin/adamas-transcribe \
  && chmod +x /usr/local/bin/adamas-transcribe

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
