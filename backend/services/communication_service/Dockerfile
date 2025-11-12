FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY ./tsconfig.json .

COPY ./shared ./shared

COPY ./services/communication_service ./services/communication_service

WORKDIR /app/services/communication_service

RUN rm -rf ./dist

RUN npm install

RUN npm run build

EXPOSE 3012

CMD ["npm", "start"]