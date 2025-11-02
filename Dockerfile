FROM node:20-alpine AS builder

RUN apk update && apk add --no-cache curl

RUN addgroup -S periyaruniversity && adduser -S periyaruniversity -G periyaruniversity

WORKDIR /home/periyaruniversity/Faculty-Backend

RUN chown -R periyaruniversity:periyaruniversity /home/periyaruniversity/Faculty-Backend

COPY --chown=periyaruniversity:periyaruniversity package*.json .

RUN npm update -g npm

USER periyaruniversity

RUN npm install --legacy-peer-deps

COPY --chown=periyaruniversity:periyaruniversity . .

CMD ["npm", "run", "dev"]
