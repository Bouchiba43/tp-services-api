FROM node:22-alpine AS deps
WORKDIR /build
COPY notification-service/package.json notification-service/package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY notification-service/ ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY notification-service/package.json notification-service/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /build/dist ./dist

CMD ["node", "dist/main.js"]
