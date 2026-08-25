import { DurableObject } from "cloudflare:workers";

const DEFAULT_ROOM = "denessa-lounge";
const MAX_MESSAGES = 100;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ================================
    // Главная
    // ================================

    if (url.pathname === "/") {
      return Response.json({
        name: "Denessa",
        version: "1.3",
        status: "online",
        room: DEFAULT_ROOM,
        websocket: "/ws?room=denessa-lounge",
      });
    }

    // ================================
    // Проверка сервера
    // ================================

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "Denessa",
        version: "1.3",
        online: true,
        time: new Date().toISOString(),
      });
    }

    // ================================
    // WebSocket
    // ================================

    if (
      url.pathname === "/ws" &&
      request.headers.get("Upgrade")?.toLowerCase() ===
        "websocket"
    ) {
      const room =
        url.searchParams.get("room") ||
        DEFAULT_ROOM;

      const id =
        env.DENESSA_ROOM.idFromName(room);

      const roomObject =
        env.DENESSA_ROOM.get(id);

      return roomObject.fetch(request);
    }

    // ================================
    // Получение сообщений
    // ================================

    if (
      url.pathname === "/api/messages" &&
      request.method === "GET"
    ) {
      const room =
        url.searchParams.get("room") ||
        DEFAULT_ROOM;

      const id =
        env.DENESSA_ROOM.idFromName(room);

      const roomObject =
        env.DENESSA_ROOM.get(id);

      return roomObject.fetch(
        new Request(
          new URL(
            `/messages?room=${encodeURIComponent(
              room
            )}`,
            request.url
          ),
          request
        )
      );
    }

    // ================================
    // Информация о комнате
    // ================================

    if (
      url.pathname === "/api/room" &&
      request.method === "GET"
    ) {
      const room =
        url.searchParams.get("room") ||
        DEFAULT_ROOM;

      const id =
        env.DENESSA_ROOM.idFromName(room);

      const roomObject =
        env.DENESSA_ROOM.get(id);

      return roomObject.fetch(
        new Request(
          new URL(
            `/room?room=${encodeURIComponent(
              room
            )}`,
            request.url
          ),
          request
        )
      );
    }

    return new Response(
      "Denessa 1.3 Worker",
      {
        status: 200,
        headers: {
          "content-type":
            "text/plain; charset=utf-8",
        },
      }
    );
  },
};

// ======================================================
// DENESSA ROOM
// ======================================================

export class DenessaRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);

    this.ctx = ctx;
    this.env = env;

    this.ctx.blockConcurrencyWhile(
      async () => {
        await this.initialize();
      }
    );
  }

  // ====================================================
  // DATABASE
  // ====================================================

  async initialize() {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        client_id TEXT,
        author TEXT NOT NULL,
        text TEXT NOT NULL,
        time TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
  }

  // ====================================================
  // FETCH
  // ====================================================

  async fetch(request) {
    const url = new URL(request.url);

    // WebSocket
    if (
      request.headers.get("Upgrade")?.toLowerCase() ===
      "websocket"
    ) {
      return this.handleWebSocket(request);
    }

    // Messages API
    if (
      url.pathname === "/messages" &&
      request.method === "GET"
    ) {
      return this.getMessages();
    }

    // Room API
    if (
      url.pathname === "/room" &&
      request.method === "GET"
    ) {
      return this.getRoomInfo();
    }

    return new Response(
      "Denessa Room",
      {
        status: 200,
      }
    );
  }

  // ====================================================
  // WEBSOCKET CONNECTION
  // ====================================================

  async handleWebSocket(request) {
    const pair =
      new WebSocketPair();

    const client =
      pair[0];

    const server =
      pair[1];

    const url =
      new URL(request.url);

    const username =
      url.searchParams.get("username") ||
      "Участник";

    const clientId =
      url.searchParams.get("client") ||
      `${Date.now()}-${crypto.randomUUID()}`;

    this.ctx.acceptWebSocket(server);

    server.serializeAttachment({
      username,
      clientId,
      connectedAt: Date.now(),
    });

    // --------------------------------
    // Отправляем историю
    // --------------------------------

    const messages =
      await this.loadMessages();

    server.send(
      JSON.stringify({
        type: "history",
        room: DEFAULT_ROOM,
        messages,
      })
    );

    // --------------------------------
    // Сообщаем количество пользователей
    // --------------------------------

    this.broadcastPresence();

    return new Response(
      null,
      {
        status: 101,
        webSocket: client,
      }
    );
  }

  // ====================================================
  // MESSAGE
  // ====================================================

  async webSocketMessage(
    ws,
    rawMessage
  ) {
    try {
      const data =
        typeof rawMessage === "string"
          ? JSON.parse(rawMessage)
          : rawMessage;

      if (!data) {
        return;
      }

      if (
        data.type !== "message"
      ) {
        return;
      }

      const text =
        String(
          data.text ||
            data.content ||
            ""
        ).trim();

      if (!text) {
        return;
      }

      const attachment =
        ws.deserializeAttachment() ||
        {};

      const author =
        data.author ||
        attachment.username ||
        "Участник";

      const clientId =
        data.clientId ||
        attachment.clientId ||
        "";

      const now =
        new Date();

      const time =
        data.time ||
        now.toLocaleTimeString(
          "ru-RU",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );

      const id =
        data.id ||
        `${Date.now()}-${crypto.randomUUID()}`;

      const message = {
        id,
        clientId,
        author,
        text,
        time,
        mine: false,
      };

      // Сохраняем
      await this.saveMessage(
        message
      );

      // Рассылаем всем
      this.broadcast({
        type: "message",
        message,
      });
    } catch (error) {
      console.error(
        "Denessa message error:",
        error
      );

      try {
        ws.send(
          JSON.stringify({
            type: "error",
            message:
              "Не удалось отправить сообщение.",
          })
        );
      } catch {}
    }
  }

  // ====================================================
  // CLOSE
  // ====================================================

  async webSocketClose(
    ws,
    code,
    reason
  ) {
    try {
      ws.close(
        code,
        reason
      );
    } catch {}

    this.broadcastPresence();
  }

  // ====================================================
  // ERROR
  // ====================================================

  async webSocketError(
    ws,
    error
  ) {
    console.error(
      "Denessa WebSocket error:",
      error
    );
  }

  // ====================================================
  // SAVE
  // ====================================================

  async saveMessage(
    message
  ) {
    this.ctx.storage.sql.exec(
      `
      INSERT OR REPLACE INTO messages
      (
        id,
        client_id,
        author,
        text,
        time,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      message.id,
      message.clientId || "",
      message.author,
      message.text,
      message.time,
      Date.now()
    );

    // Оставляем последние 100 сообщений
    this.ctx.storage.sql.exec(
      `
      DELETE FROM messages
      WHERE id NOT IN (
        SELECT id
        FROM messages
        ORDER BY created_at DESC
        LIMIT ?
      )
      `,
      MAX_MESSAGES
    );
  }

  // ====================================================
  // LOAD
  // ====================================================

  async loadMessages() {
    const result =
      this.ctx.storage.sql.exec(
        `
        SELECT
          id,
          client_id,
          author,
          text,
          time
        FROM messages
        ORDER BY created_at ASC
        LIMIT ?
        `,
        MAX_MESSAGES
      );

    return Array.from(
      result
    ).map(
      (row) => ({
        id: row.id,
        clientId:
          row.client_id || "",
        author: row.author,
        text: row.text,
        time: row.time,
        mine: false,
      })
    );
  }

  // ====================================================
  // API MESSAGES
  // ====================================================

  async getMessages() {
    const messages =
      await this.loadMessages();

    return Response.json({
      ok: true,
      messages,
    });
  }

  // ====================================================
  // ROOM INFO
  // ====================================================

  async getRoomInfo() {
    const online =
      this.ctx
        .getWebSockets()
        .length;

    const messages =
      await this.loadMessages();

    return Response.json({
      ok: true,
      room: DEFAULT_ROOM,
      online,
      messageCount:
        messages.length,
    });
  }

  // ====================================================
  // PRESENCE
  // ====================================================

  broadcastPresence() {
    const online =
      this.ctx
        .getWebSockets()
        .length;

    this.broadcast({
      type: "presence",
      online,
    });
  }

  // ====================================================
  // BROADCAST
  // ====================================================

  broadcast(
    data,
    except = null
  ) {
    const encoded =
      JSON.stringify(data);

    const sockets =
      this.ctx.getWebSockets();

    for (
      const socket of sockets
    ) {
      if (
        socket === except
      ) {
        continue;
      }

      try {
        if (
          socket.readyState ===
          WebSocket.OPEN
        ) {
          socket.send(
            encoded
          );
        }
      } catch (error) {
        console.error(
          "Denessa broadcast error:",
          error
        );
      }
    }
  }
}
