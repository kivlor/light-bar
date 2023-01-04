import { connect } from "https://deno.land/x/redis@v0.27.4/mod.ts";
import { serve } from "https://deno.land/std@0.159.0/http/server.ts";

const redisHost = Deno.env.get("REDIS_HOST") || "localhost";
const redisPort = Deno.env.get("REDIS_POST") || 6379;
const redis = await connect({ hostname: redisHost, port: redisPort });

const getLights = async () => {
  const left = await redis.get("left");
  const right = await redis.get("right");

  return { left, right };
};

const statusRoute = new URLPattern({ pathname: "/status" });

const handler = (req: Request): Response => {
  if (statusRoute.exec(req.url)) {
    return new Response("ok");
  }

  let timer: number;

  const body = new ReadableStream({
    async start(controller) {
      const lights = await getLights();
      controller.enqueue(JSON.stringify(lights));

      timer = setInterval(async () => {
        const lights = await getLights();
        controller.enqueue(
          `event: update\ndata: ${JSON.stringify(lights)}\n\n`,
        );
      }, 1000);
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(body.pipeThrough(new TextEncoderStream()), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/event-stream",
    },
  });
};

const servePort = Deno.env.get("PORT") || 9000;
serve(handler, { port: parseInt(servePort, 10) });
