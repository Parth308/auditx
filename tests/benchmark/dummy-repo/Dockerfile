FROM node:18-alpine
# Intentionally running as root
WORKDIR /app
COPY . .
RUN npm install
USER node
HEALTHCHECK CMD node -v || exit 1
CMD ["node", "server.js"]
