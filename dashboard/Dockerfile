FROM node:22-alpine AS deps
WORKDIR /build
RUN npm install -g pnpm
COPY dashboard/package.json dashboard/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /build
RUN npm install -g pnpm
COPY --from=deps /build/node_modules ./node_modules
COPY dashboard/ ./
RUN pnpm build

FROM nginx:alpine AS runner
COPY --from=builder /build/dist /usr/share/nginx/html
COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
