# ===== Books Social System — production image (Coolify) =====

# قاعدة مشتركة فيها openssl (Prisma محتاجه في الـbuild والتشغيل)
FROM node:22-bookworm-slim AS base
ENV DEBIAN_FRONTEND=noninteractive NEXT_TELEMETRY_DISABLED=1 NPM_CONFIG_UPDATE_NOTIFIER=false
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates wget \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

FROM base AS run

ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

# الملكية بتتحدد وقت النسخ (من غير chown -R على node_modules — بطيء وبيضاعف حجم الصورة)
# node_modules كاملة عشان prisma migrate و tsx (seed / create-admin) يشتغلوا جوه الكونتينر
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/.next/standalone ./
COPY --chown=node:node --from=build /app/.next/static ./.next/static
COPY --chown=node:node --from=build /app/public ./public
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node --from=build /app/prisma.config.ts /app/tsconfig.json ./
COPY --chown=node:node --from=build /app/scripts ./scripts
COPY --chown=node:node --from=build /app/lib ./lib
COPY --chown=node:node --chmod=755 --from=build /app/docker-entrypoint.sh ./docker-entrypoint.sh

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["./docker-entrypoint.sh"]
