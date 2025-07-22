FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/affinity-groups/package*.json ./packages/affinity-groups/

# Copy npmrc
COPY .npmrc ./

# Install dependencies including devDependencies for build
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Expose port for Railway
EXPOSE $PORT

# Start command
CMD ["node", "packages/affinity-groups/dist/index.js"]