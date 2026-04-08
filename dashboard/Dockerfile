FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source
COPY . .

EXPOSE 8080

CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "8080"]
