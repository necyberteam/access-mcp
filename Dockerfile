FROM node:18-slim

WORKDIR /app

# Copy all files first (needed for workspaces)
COPY . .

# Install dependencies
RUN npm install --verbose

# Build the project
RUN npm run build

# Expose port for Railway
EXPOSE $PORT

# Start command
CMD ["node", "packages/affinity-groups/dist/index.js"]