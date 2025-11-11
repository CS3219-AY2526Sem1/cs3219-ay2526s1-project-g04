# Use a single stage, starting from node:24-slim
FROM node:24-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./

RUN npm install

COPY src ./src 

RUN npx tsc

EXPOSE 3010

CMD ["node", "dist/server.js"]