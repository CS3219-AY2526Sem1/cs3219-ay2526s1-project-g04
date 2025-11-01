FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build


# FROM node:24-alpine AS runtime

# WORKDIR /app

# COPY package*.json ./
# RUN npm install --omit=dev

# COPY --from=build /app/dist ./dist

EXPOSE 3008

CMD ["npm", "start"]
