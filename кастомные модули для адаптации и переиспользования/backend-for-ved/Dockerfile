FROM node:20.17.0

WORKDIR /usr/src/app

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends ghostscript graphicsmagick && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

EXPOSE 30000

CMD ["yarn", "start:prod"]
