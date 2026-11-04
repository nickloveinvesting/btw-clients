FROM oven/bun:1.1-alpine
WORKDIR /app
COPY server.ts index.html ./
ENV NODE_ENV=production
CMD ["bun", "server.ts"]
