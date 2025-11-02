# syntax=docker.io/docker/dockerfile:1
# Edited from https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat && corepack enable pnpm
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml  ./
RUN pnpm install --frozen-lockfile
  

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_QUESTION_SERVICE
ARG NEXT_PUBLIC_API_COLLAB_SERVICE
ARG NEXT_PUBLIC_API_MATCHING_SERVICE
ARG NEXT_PUBLIC_API_USER_SERVICE
ARG NEXT_PUBLIC_API_CODE_EXE_SERVICE
ARG NEXT_PUBLIC_API_COMMS_SERVICE

ENV NEXT_PUBLIC_API_QUESTION_SERVICE=$NEXT_PUBLIC_API_QUESTION_SERVICE
ENV NEXT_PUBLIC_API_COLLAB_SERVICE=$NEXT_PUBLIC_API_COLLAB_SERVICE
ENV NEXT_PUBLIC_API_MATCHING_SERVICE=$NEXT_PUBLIC_API_MATCHING_SERVICE
ENV NEXT_PUBLIC_API_USER_SERVICE=$NEXT_PUBLIC_API_USER_SERVICE
ENV NEXT_PUBLIC_API_CODE_EXE_SERVICE=$NEXT_PUBLIC_API_CODE_EXE_SERVICE
ENV NEXT_PUBLIC_API_COMMS_SERVICE=$NEXT_PUBLIC_API_COMMS_SERVICE

RUN corepack enable pnpm && pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production



COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static


EXPOSE 3100

ENV PORT=3100
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]