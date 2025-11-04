FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY ./tsconfig.json .

COPY ./shared ./shared

COPY ./services/matching_service ./services/matching_service

RUN ls -la

WORKDIR /app/services/matching_service

RUN rm -rf ./dist

RUN npm install

RUN npm run build

RUN ls -la

EXPOSE 3007

CMD ["npm", "start"]