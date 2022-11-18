import { connect } from "https://deno.land/x/redis@v0.27.4/mod.ts";
import { serve } from "https://deno.land/std@0.159.0/http/server.ts";

const port = Deno.env.get("PORT") || 8080;
const redisUrl = Deno.env.get("REDIS_URL") || "redis://localhost:6379/0";
const redis = await connect({ url: redisUrl });

const statusRoute = new URLPattern({ pathname: "/status" });

const handler = (req: Request): Response => {
  const match = statusRoute.exec(req.url);
  if (match) {
    return new Response("ok");
  }

  let timer: number;

  const body = new ReadableStream({
    async start(controller) {
      timer = setInterval(async () => {
        const left = await redis.get("left");
        const right = await redis.get("right");

        controller.enqueue(JSON.stringify({ left, right }));
      }, 5000);
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(body.pipeThrough(new TextEncoderStream()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};

serve(handler, { port: parseInt(port, 10) });
