FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# This VPS has only ~1GB RAM with no room to spare for `next build`'s memory
# footprint (verified: it gets OOM-killed even with 1GB of swap). So the build
# step runs on the developer machine (`npm run build`, which also produces
# `src/generated/prisma` via `prisma generate`) and this stage just assembles the
# already-built artifacts — no compilation happens inside the image.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY public ./public
COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
# Next's standalone trace only follows what the server bundle itself imports, and
# misses this generated client because prisma/seed.ts (run directly via tsx, not
# through Next) reaches it independently.
COPY src/generated ./src/generated
COPY package.json ./package.json

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
