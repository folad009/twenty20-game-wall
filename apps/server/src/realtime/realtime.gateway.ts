import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({
  cors: {
    origin:
      process.env.WEB_ORIGINS?.split(",").map((s) => s.trim()) ?? [
        "http://localhost:3000",
      ],
    credentials: true,
  },
  transports: ["websocket", "polling"],
})
export class RealtimeGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  afterInit() {
    this.server.setMaxListeners(50);
  }
}
