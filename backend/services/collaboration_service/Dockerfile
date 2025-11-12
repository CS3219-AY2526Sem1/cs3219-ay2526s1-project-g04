FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY ./tsconfig.json .

COPY ./shared ./shared

COPY ./services/collaboration_service ./services/collaboration_service

RUN ls -la

WORKDIR /app/services/collaboration_service

RUN rm -rf ./dist

RUN npm install

RUN npm run build

RUN ls -la

RUN mkdir -p ./dist/services/collaboration_service/generated && cp -r ./generated/prisma ./dist/services/collaboration_service/generated/prisma

EXPOSE 3009

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]