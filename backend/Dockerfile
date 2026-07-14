FROM node:20-bookworm-slim AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY database ./database
COPY database/schema.sql ./schema.sql

RUN mkdir -p /app/database && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
