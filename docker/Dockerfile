# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

ENV COREPACK_HOME=/opt/corepack
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable \
  && corepack prepare pnpm@10.18.3 --activate \
  && chmod -R a+rX /opt/corepack
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /repo

FROM base AS dev

RUN mkdir -p \
    /repo/node_modules \
    /repo/apps/web/node_modules \
    /repo/apps/api/node_modules \
    /repo/packages/domain/node_modules \
    /pnpm/store \
  && chown -R node:node \
    /repo/node_modules \
    /repo/apps/web/node_modules \
    /repo/apps/api/node_modules \
    /repo/packages/domain/node_modules \
    /pnpm/store

ENV npm_config_store_dir=/pnpm/store
USER node

FROM base AS build

COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
RUN --mount=type=cache,id=piko-pnpm,target=/pnpm/store \
  pnpm fetch

COPY . .
RUN --mount=type=cache,id=piko-pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --offline

RUN NODE_ENV=production pnpm --filter @piko/web build
RUN NODE_ENV=production pnpm --filter @piko/api build

# PGlite is test-only, but Drizzle's optional peer makes pnpm deploy --prod include it.
RUN --mount=type=cache,id=piko-pnpm,target=/pnpm/store \
  pnpm --filter @piko/api deploy --prod --legacy /out/api \
  && mkdir -p /out/api/node_modules/.pnpm/drizzle-orm@0.45.3_postgres@3.4.9/node_modules \
  && cp -aL /out/api/node_modules/drizzle-orm \
    /out/api/node_modules/.pnpm/drizzle-orm@0.45.3_postgres@3.4.9/node_modules/drizzle-orm \
  && rm -f \
    /out/api/node_modules/drizzle-orm \
    /out/api/node_modules/.pnpm/node_modules/drizzle-orm \
  && ln -s \
    .pnpm/drizzle-orm@0.45.3_postgres@3.4.9/node_modules/drizzle-orm \
    /out/api/node_modules/drizzle-orm \
  && ln -s \
    ../drizzle-orm@0.45.3_postgres@3.4.9/node_modules/drizzle-orm \
    /out/api/node_modules/.pnpm/node_modules/drizzle-orm \
  && find /out/api/node_modules -depth -name '*electric-sql*' -exec rm -rf {} + \
  && remaining_paths="$(find /out/api/node_modules -name '*electric-sql*' -print)" \
  && if [ -n "$remaining_paths" ]; then \
    echo 'Unexpected electric-sql path in the production API dependencies:' >&2; \
    echo "$remaining_paths" >&2; \
    exit 1; \
  fi
FROM node:22-alpine AS api-prod

ENV NODE_ENV=production

RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/lib/node_modules/yarn \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg \
    /opt/yarn-*

WORKDIR /app

COPY --from=build /out/api/node_modules ./node_modules
COPY --from=build /out/api/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/drizzle ./drizzle

USER node
EXPOSE 8787
CMD ["node", "dist/index.js"]

FROM caddy:2-alpine AS web-prod

RUN addgroup -S caddy \
  && adduser -S -G caddy caddy \
  && setcap -r /usr/bin/caddy \
  && chown -R caddy:caddy /data /config

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/dist /srv

USER caddy
