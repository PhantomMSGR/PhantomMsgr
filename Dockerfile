# ─── Stage 1: install production dependencies ────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install native build tools required by sharp and other native addons
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# Install ONLY production deps; scripts are needed for sharp to rebuild bindings
RUN npm ci --omit=dev

# ─── Stage 2: build the application ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# SERVICE_NAME is passed as a build argument (e.g. api-gateway, auth-service…)
ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

# Webpack bundles app code + @phantom/* libs into a single file per service.
# node_modules stay external (resolved at runtime from the deps stage).
RUN npx nest build ${SERVICE_NAME} --webpack --webpackPath webpack.config.js

# ─── Stage 3: minimal production image ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Bring in native addons (sharp, etc.) that webpack kept as externals
COPY --from=deps /app/node_modules ./node_modules

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

COPY --from=builder /app/dist/apps/${SERVICE_NAME}/main.js ./dist/main.js

# Run as non-root user
USER node

CMD ["node", "dist/main.js"]
