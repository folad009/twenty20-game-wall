import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { getWebOriginsList, isCorsOriginAllowed, normalizeOrigin } from "./cors-origins";

const logger = new Logger("CORS");

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  logger.log(`Allowing origins: ${getWebOriginsList().join(", ")}${
    process.env.CORS_ALLOW_VERCEL === "1" ? " + *.vercel.app" : ""
  }`);

  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!isCorsOriginAllowed(requestOrigin)) {
        if (requestOrigin) {
          logger.warn(
            `Blocked origin ${requestOrigin} (expected one of: ${getWebOriginsList().map(normalizeOrigin).join(", ")}). Set WEB_ORIGINS in Railway, or CORS_ALLOW_VERCEL=1 for all Vercel previews.`,
          );
        }
        return callback(null, false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
    ],
    maxAge: 86_400,
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`API + WebSocket listening on http://localhost:${port}`);
}

bootstrap();
