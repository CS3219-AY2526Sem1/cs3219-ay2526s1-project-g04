FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN apk update && \
    apk add --no-cache python3 make g++ openssl && \
    rm -rf /var/cache/apk/*

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

RUN apk del python3 make g++

EXPOSE 3005

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]