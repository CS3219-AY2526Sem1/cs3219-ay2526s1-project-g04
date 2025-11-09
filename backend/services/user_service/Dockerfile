# --- SINGLE STAGE BUILD & RUNTIME ---
FROM node:24-alpine

WORKDIR /app

# Install all dependencies required for the native modules (like bcrypt)
# and for the Prisma engines (OpenSSL).
COPY package*.json ./

# Install:
# 1. python3, make, g++ (for compiling native Node modules like bcrypt).
# 2. openssl (CRITICAL for Prisma engine to run and connect to Postgres).
RUN apk update && \
    apk add --no-cache python3 make g++ openssl && \
    rm -rf /var/cache/apk/*

RUN npm install

COPY . .

# Run build steps (Prisma, TypeScript compilation)
# Prisma is re-generated to ensure the OpenSSL dependency is linked correctly
RUN npx prisma generate
RUN npm run build

# Clean up build-time dependencies to minimize the final image size
RUN apk del python3 make g++

EXPOSE 3005

# CMD: Execute Prisma deployment and then start the application
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]