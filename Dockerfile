FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN npm install

COPY . .
RUN npm run build --workspace=packages/shared
RUN cd apps/server && npx prisma generate && npx tsc --project tsconfig.build.json
RUN npm run build --workspace=apps/client

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# If you want to serve the client from the server, you might need to copy client dist too
COPY --from=builder /app/apps/client/dist ./apps/client/dist

EXPOSE 3001
CMD ["npm", "run", "start", "--workspace=apps/server"]
