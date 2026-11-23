FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node public ./public
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
ENV PORT=3000 HOST=0.0.0.0 DATA_DIR=/app/data
EXPOSE 3000
CMD ["node", "server.mjs"]
