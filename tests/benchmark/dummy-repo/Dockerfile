FROM node:18-alpine
# Intentionally running as root
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "server.js"]
