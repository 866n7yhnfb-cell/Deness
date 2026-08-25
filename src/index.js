import { DurableObject } from "cloudflare:workers";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // WebSocket endpoint
    if (url.pathname === "/ws") {
      if (
        request.method !== "GET" ||
        request.headers.get("Upgrade")?.toLowerCase() !== "websocket"
      ) {
        return new Response("WebSocket required", { status: 426 });
      }

      const room =
        (url.searchParams.get("room") || "denessa-main").slice(0, 80);

      const id = env.DENESSA_CHAT.idFromName(room);
      const chat = env.DENESSA_CHAT.get(id);

      return chat.fetch(request);
    }

    // Проверка сервера
    if (url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        app: "Denessa",
        version: "1.3",
        status: "online"
      });
    }

    return env.ASSETS.fetch(request);
  }
};

export class DenessaChat extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sessions = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket required", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    const user =
      (url.searchParams.get("user") || "Гость").slice(0, 40);

    const sessionId =
      crypto.randomUUID();

    server.accept();

    this.sessions.set(sessionId, {
      ws: server,
      user
    });

    server.send(
      JSON.stringify({
        type: "welcome",
        version: "1.3",
        user,
        online: this.sessions.size
      })
    );

    this.broadcast({
      type: "system",
      text: `${user} вошёл в Denessa`,
      online: this.sessions.size
    }, sessionId);

    server.addEventListener("message", async event => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "message") {
          const text = String(data.text || "").trim();

          if (!text) return;

          const message = {
            type: "message",
            id: crypto.randomUUID(),
            user,
            text: text.slice(0, 2000),
            time: Date.now()
          };

          await this.ctx.storage.put(
            `message:${message.id}`,
            message
          );

          this.broadcast(message);
        }

        if (data.type === "typing") {
          this.broadcast({
            type: "typing",
            user,
            value: Boolean(data.value)
          }, sessionId);
        }

      } catch {
        server.send(
          JSON.stringify({
            type: "error",
            message: "Неверный формат сообщения"
          })
        );
      }
    });

    server.addEventListener("close", () => {
      this.sessions.delete(sessionId);

      this.broadcast({
        type: "system",
        text: `${user} вышел из Denessa`,
        online: this.sessions.size
      });
    });

    server.addEventListener("error", () => {
      this.sessions.delete(sessionId);
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  broadcast(payload, exceptId = null) {
    const message = JSON.stringify(payload);

    for (const [id, session] of this.sessions) {
      if (id === exceptId) continue;

      try {
        session.ws.send(message);
      } catch {
        this.sessions.delete(id);
      }
    }
  }
}
