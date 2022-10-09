FROM denoland/deno:alpine

WORKDIR /app

ADD . .

CMD [ "deno", "task", "update" ] 
