FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json .npmrc ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
RUN npx playwright install --with-deps chromium
RUN mkdir -p /app/.runtime && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm","run","start"]
