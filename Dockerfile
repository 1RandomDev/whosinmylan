FROM alpine:latest

RUN apk add --no-cache nodejs npm tzdata arp-scan python3 g++ make \
    && mkdir /data

COPY . /app
WORKDIR /app
RUN npm install --omit=dev

ENV DATABASE_FILE /data/data.db
ENTRYPOINT ["node", "src/main.js"]
