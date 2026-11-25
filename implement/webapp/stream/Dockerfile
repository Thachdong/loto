# Stream server tiếng rao (ADR-08) — build từ thư mục implement/webapp:
#   docker build -f stream/Dockerfile -t loto-stream .
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm install --no-save tsx@4.23.15
COPY tsconfig.json ./
COPY stream ./stream
COPY src/features/room/shared/domain/voice-pack.ts ./src/features/room/shared/domain/voice-pack.ts
COPY src/features/game/shared/domain/select-clip.ts ./src/features/game/shared/domain/select-clip.ts
COPY public/audio ./public/audio
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npx", "tsx", "stream/server.ts"]
