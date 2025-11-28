FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev
COPY . .
RUN npm run build
EXPOSE 8787
CMD ["node", "dist/index.js"]
