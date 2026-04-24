import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  const webOrigins =
    process.env.WEB_ORIGINS?.split(",").map((s) => s.trim()) ?? [
      "http://localhost:3000",
    ];

  app.enableCors({
    origin: webOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`API + WebSocket listening on http://localhost:${port}`);
}

bootstrap();
