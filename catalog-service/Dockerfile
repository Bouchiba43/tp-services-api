FROM node:22-alpine AS deps
WORKDIR /build
COPY catalog-service/package.json catalog-service/package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY catalog-service/ ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY catalog-service/package.json catalog-service/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /build/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main.js"]
