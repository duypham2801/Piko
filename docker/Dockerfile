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
