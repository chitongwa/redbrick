FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source
COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
