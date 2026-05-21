FROM node:22-alpine AS deps
WORKDIR /build
COPY stock-service/package.json stock-service/package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY stock-service/ ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /repo/stock-service
ENV NODE_ENV=production
COPY stock-service/package.json stock-service/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /build/dist ./dist
COPY proto/ /repo/proto/
EXPOSE 5001
CMD ["node", "dist/main.js"]
