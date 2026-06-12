# Production image. Pair with docker-compose.yml, or run standalone with a
# volume for the SQLite database (see docs/DEPLOYMENT.md for Postgres).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
# Dev deps are needed for the build stage; postinstall runs `prisma generate`.
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Dummy envs so `next build` succeeds; real values come in at runtime.
ENV DATABASE_URL="file:./build.db"
ENV SESSION_SECRET="build-only-session-secret-replaced-at-runtime-123"
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/next.config.ts ./

EXPOSE 3000
# Sync the schema (idempotent) then serve.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start"]
