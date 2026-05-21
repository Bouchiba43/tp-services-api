FROM node:22-alpine AS deps
WORKDIR /build
COPY query-service/package.json query-service/package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY query-service/ ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY query-service/package.json query-service/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /build/dist ./dist

EXPOSE 3005
CMD ["node", "dist/main.js"]
