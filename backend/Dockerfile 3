# OmniTravel · backend NestJS — imagen de despliegue (API + proxy Valhalla).
# Multi-stage: compila TypeScript y publica solo dependencias de producción.
#
# Variables de entorno en runtime:
#   PORT          puerto HTTP (por defecto 3000)
#   VALHALLA_URL  URL base del motor de ruteo (por defecto http://localhost:8002)

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
