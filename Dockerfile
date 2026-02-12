FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1
ENV STANDALONE_BUILD=true


RUN npm run build

# Manager stage (Full Source + Dev Deps for API & Rebuilds)
# Manager stage (Full Source + Dev Deps for API & Rebuilds)
FROM base AS manager
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the project (Standard Server Build) so we can run 'npm start'
RUN npm run build

# Ensure we can write to filesystem
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir -p /app/cache && chown nextjs:nodejs /app/cache
RUN mkdir -p /app/public/images && chown nextjs:nodejs /app/public/images
RUN mkdir -p /app/out && chown nextjs:nodejs /app/out

# Manager needs root to cleanup shared volumes populated by other containers
# USER nextjs 
EXPOSE 3000
CMD ["npm", "start"]

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ensure cache directory exists and has correct permissions
RUN mkdir -p /app/cache && chown nextjs:nodejs /app/cache

# Ensure public/images exists and has correct permissions
RUN mkdir -p /app/public/images && chown nextjs:nodejs /app/public/images

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
