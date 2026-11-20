# node:24-alpine (not node:22, used on the dev machine) — satisfies the
# Firebase sub-dependency engine requirement (>=24.12.0) flagged in
# ENG-SPT-007's handoff, so the EBADENGINE warning doesn't apply in this
# image.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at build time —
# they are Firebase's public-by-design client config (THREAT-SPT-001
# "Spoofing" note), not secrets. The emulator defaults below are for this
# local/Docker deployment only; a real deployment passes its own project's
# values as build args.
ARG NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-oes-sports.firebaseapp.com
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-oes-sports
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-oes-sports.appspot.com
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
ARG NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000
ARG NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
ARG NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=firebase-emulator:9099
ARG NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=firebase-emulator:8080
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_USE_FIREBASE_EMULATOR=$NEXT_PUBLIC_USE_FIREBASE_EMULATOR \
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=$NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST \
    NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=$NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
