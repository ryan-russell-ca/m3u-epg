FROM node:17-alpine

RUN apk update && apk add --no-cache libc6-compat gcompat

WORKDIR /code

COPY package*.json ./

RUN yarn install

ENV NODE_OPTIONS='--max_old_space_size=4096'

EXPOSE 3000

CMD ["npm", "run", "dev"]
