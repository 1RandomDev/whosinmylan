FROM alpine:latest

RUN apk add --no-cache nodejs npm tzdata arp-scan python3 py3-pip g++ make \
    && pip install --no-cache-dir apprise \
    && mkdir /data

COPY . /app
WORKDIR /app
RUN npm install --omit=dev
RUN node tools/macvendor.js

ENV DATABASE_FILE /data/data.db
ENTRYPOINT ["node", "src/main.js"]
