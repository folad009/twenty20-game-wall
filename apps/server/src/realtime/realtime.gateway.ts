import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server } from "socket.io";
import { isCorsOriginAllowed } from "../cors-origins";

@WebSocketGateway({
  cors: {
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!isCorsOriginAllowed(requestOrigin)) {
        return callback(null, false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
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
