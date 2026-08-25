import { DurableObject } from "cloudflare:workers";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.method !== "GET" || request.headers.get("Upgrade") !== "websocket") {
        return new Response("WebSocket required", { status: 426 });
      }

      const room = (url.searchParams.get("room") || "denessa-main").slice(0, 80);
      const id = env.DENESSA_CHAT.idFromName(room);
      const stub = env.DENESSA_CHAT.get(id);
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};

export class DenessaChat extends DurableObject {
  sessions = new Map();

  constructor(ctx, env) {
    super(ctx, env);

    this.ctx.getWebSockets().forEach((ws) => {
      const attachment = ws.deserializeAttachment();
      if (attachment) this.sessions.set(ws, attachment);
    });

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong")
    );
  }

  async fetch(request) {
    const url = new URL(request.url);
    const name = (url.searchParams.get("name") || "Моряк").slice(0, 24);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    const session = {
      id: crypto.randomUUID(),
      name
    };

    server.serializeAttachment(session);
    this.sessions.set(server, session);

    const messages = (await this.ctx.storage.get("messages")) || [];
    server.send(JSON.stringify({
      type: "history",
      messages: messages.slice(-100),
      online: this.sessions.size
    }));

    this.broadcast({ type: "presence", online: this.sessions.size });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    const session = this.sessions.get(ws);
    if (!session) return;

    let data;
    try { data = JSON.parse(raw); } catch { return; }

    if (data.type === "hello" && typeof data.name === "string") {
      session.name = data.name.slice(0, 24);
      ws.serializeAttachment(session);
      this.sessions.set(ws, session);
      this.broadcast({ type: "presence", online: this.sessions.size });
      return;
    }

    if (data.type !== "message") return;

    const text = String(data.text || "").trim().slice(0, 2000);
    if (!text) return;

    const message = {
      id: crypto.randomUUID(),
      name: session.name,
      text,
      time: new Date().toISOString()
    };

    const messages = (await this.ctx.storage.get("messages")) || [];
    messages.push(message);
    const trimmed = messages.slice(-100);
    await this.ctx.storage.put("messages", trimmed);

    this.broadcast({ type: "message", message });
  }

  async webSocketClose(ws) {
    this.sessions.delete(ws);
    try { ws.close(); } catch {}
    this.broadcast({ type: "presence", online: this.sessions.size });
  }

  async webSocketError(ws) {
    this.sessions.delete(ws);
  }

  broadcast(payload) {
    const message = JSON.stringify(payload);
    for (const ws of this.sessions.keys()) {
      try { ws.send(message); } catch {}
    }
  }
}
