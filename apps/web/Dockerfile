# Multi-stage build for production
FROM node:22-alpine AS deps

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

RUN set -eux; \
	# bascule éventuellement sur un miroir plus fiable
	echo "https://dl-cdn.alpinelinux.org/alpine/v3.22/main" > /etc/apk/repositories; \
	echo "https://dl-cdn.alpinelinux.org/alpine/v3.22/community" >> /etc/apk/repositories; \
	for i in 1 2 3; do \
		apk update && \
		apk add --no-cache \
			python3 \
			build-base \
			pkgconf \
			cairo-dev \
			pango-dev \
			libjpeg-turbo-dev \
			giflib-dev \
			pixman-dev \
			freetype-dev \
			fontconfig-dev \
		&& break || { echo "apk failed, retrying in 5s…"; sleep 5; }; \
	done; \
	ln -sf /usr/bin/python3 /usr/bin/python

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Runtime stage
FROM node:22-alpine AS runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set permissions
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV production

# Start the application
CMD ["node", "server.js"]
