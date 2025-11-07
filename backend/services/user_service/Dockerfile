# --- SINGLE STAGE BUILD & RUNTIME ---
# This single stage handles everything: installing build tools, compiling
# native modules (like bcrypt), running the build, and cleaning up.
FROM node:24-alpine

WORKDIR /app

# Install all dependencies required for the native modules (like bcrypt)
# and for running the application.
COPY package*.json ./

# Install packages needed for compilation (g++, make, python3).
# Then run npm install to compile native modules.
# Finally, remove the build-time dependencies (g++, make, python3) to minimize image size.
RUN apk add --no-cache python3 make g++ && \
    npm install && \
    npm prune --omit=dev && \
    apk del python3 make g++

COPY . .

# Run build steps (Prisma, TypeScript compilation)
RUN npx prisma generate
RUN npm run build

# The compiled output is now ready in /app/dist

EXPOSE 3005

CMD ["npm", "start"]