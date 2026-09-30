# SiteSpeak 2.0 — Autonomous Industrial Safety Voice Agent
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and package descriptors
COPY package*.json ./
COPY apps/client/package*.json ./apps/client/
COPY apps/server/package*.json ./apps/server/
COPY packages/schemas/package*.json ./packages/schemas/

RUN npm install

# Copy source files
COPY . .

# Seed database and build both frontend and backend
RUN npm run build
RUN npm run seed

# Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787

COPY --from=builder /app ./

EXPOSE 8787

CMD ["npm", "start"]
