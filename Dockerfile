FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV CONFIG_PATH=/app/config.json
ENV TEMPLATE_PATH=/app/template.json

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/static ./dist/static
COPY template.json ./template.json

CMD ["sh", "-c", "node ./dist/app.js -p ${PORT} -c ${CONFIG_PATH} -t ${TEMPLATE_PATH}"]
