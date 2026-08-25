import { DurableObject } from "cloudflare:workers";

const DEFAULT_ROOM = "denessa-lounge";
const MAX_MESSAGES = 100;


// ======================================================
// WORKER
// ======================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --------------------------------------------------
    // HOME
    // --------------------------------------------------

    if (url.pathname === "/") {
      return Response.json({
        ok: true,
        name: "Denessa",
        version: "1.3",
        status: "online",
        room: DEFAULT_ROOM,
        websocket: "/ws?room=denessa-lounge",
      });
    }


    // --------------------------------------------------
    // HEALTH
    // --------------------------------------------------

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "Denessa",
        version: "1.3",
        online: true,
        time: new Date().toISOString(),
      });
    }


    // --------------------------------------------------
    // DEBUG ROOM
    // --------------------------------------------------

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
            "/room",
            request.url
          ),
          request
        )
      );
    }


    // --------------------------------------------------
    // MESSAGES
    // --------------------------------------------------

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
            "/messages",
            request.url
          ),
          request
        )
      );
    }


    // --------------------------------------------------
    // WEBSOCKET
    // --------------------------------------------------

    if (url.pathname === "/ws") {

      const upgrade =
        request.headers
          .get("Upgrade")
          ?.toLowerCase();

      if (upgrade !== "websocket") {
        return new Response(
          "Expected WebSocket",
          {
            status: 426,
            headers: {
              "content-type":
                "text/plain; charset=utf-8",
            },
          }
        );
      }


      const room =
        url.searchParams.get("room") ||
        DEFAULT_ROOM;


      const id =
        env.DENESSA_ROOM.idFromName(room);


      const roomObject =
        env.DENESSA_ROOM.get(id);


      return roomObject.fetch(
        request
      );
    }


    // --------------------------------------------------
    // 404
    // --------------------------------------------------

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

    const url =
      new URL(request.url);


    // --------------------------------------------------
    // WEBSOCKET
    // --------------------------------------------------

    if (
      request.headers
        .get("Upgrade")
        ?.toLowerCase() ===
      "websocket"
    ) {
      return this.handleWebSocket(
        request
      );
    }


    // --------------------------------------------------
    // MESSAGES
    // --------------------------------------------------

    if (
      url.pathname === "/messages" &&
      request.method === "GET"
    ) {
      return this.getMessages();
    }


    // --------------------------------------------------
    // ROOM
    // --------------------------------------------------

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
  // WEBSOCKET
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
      url.searchParams.get(
        "username"
      ) ||
      "Участник";


    const clientId =
      url.searchParams.get(
        "client"
      ) ||
      crypto.randomUUID();


    // --------------------------------------------------
    // ACCEPT
    // --------------------------------------------------

    this.ctx.acceptWebSocket(
      server
    );


    // --------------------------------------------------
    // ATTACH USER
    // --------------------------------------------------

    server.serializeAttachment({
      username,
      clientId,
      connectedAt:
        Date.now(),
    });


    // --------------------------------------------------
    // SEND HISTORY
    // --------------------------------------------------

    const messages =
      await this.loadMessages();


    server.send(
      JSON.stringify({
        type: "history",
        room: DEFAULT_ROOM,
        messages,
      })
    );


    // --------------------------------------------------
    // SEND PRESENCE TO EVERYONE
    // --------------------------------------------------

    this.broadcastPresence();


    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return new Response(
      null,
      {
        status: 101,
        webSocket: client,
      }
    );
  }


  // ====================================================
  // MESSAGE RECEIVED
  // ====================================================

  async webSocketMessage(
    ws,
    rawMessage
  ) {

    try {

      const data =
        typeof rawMessage === "string"
          ? JSON.parse(rawMessage)
          : JSON.parse(
              new TextDecoder().decode(
                rawMessage
              )
            );


      if (!data) {
        return;
      }


      // ------------------------------------------------
      // ONLY MESSAGE
      // ------------------------------------------------

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


      // ------------------------------------------------
      // USER
      // ------------------------------------------------

      const attachment =
        ws.deserializeAttachment() ||
        {};


      const author =
        String(
          data.author ||
          attachment.username ||
          "Участник"
        );


      const clientId =
        String(
          data.clientId ||
          attachment.clientId ||
          ""
        );


      // ------------------------------------------------
      // TIME
      // ------------------------------------------------

      const now =
        new Date();


      const time =
        now.toLocaleTimeString(
          "ru-RU",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );


      // ------------------------------------------------
      // ID
      // ------------------------------------------------

      const id =
        data.id ||
        `${Date.now()}-${crypto.randomUUID()}`;


      // ------------------------------------------------
      // MESSAGE
      // ------------------------------------------------

      const message = {

        id,

        clientId,

        author,

        text,

        time,

      };


      // ------------------------------------------------
      // SAVE
      // ------------------------------------------------

      await this.saveMessage(
        message
      );


      // ------------------------------------------------
      // BROADCAST
      // ------------------------------------------------

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
              "Ошибка отправки сообщения.",
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

    console.log(
      "Denessa socket closed:",
      code,
      reason
    );


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
  // SAVE MESSAGE
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


    // --------------------------------------------------
    // KEEP LAST 100
    // --------------------------------------------------

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
  // LOAD MESSAGES
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
        id:
          row.id,

        clientId:
          row.client_id || "",

        author:
          row.author,

        text:
          row.text,

        time:
          row.time,
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

      room:
        DEFAULT_ROOM,

      online:
        this.ctx
          .getWebSockets()
          .length,

      messages,
    });
  }


  // ====================================================
  // ROOM INFO
  // ====================================================

  async getRoomInfo() {

    const sockets =
      this.ctx.getWebSockets();


    const messages =
      await this.loadMessages();


    return Response.json({

      ok: true,

      room:
        DEFAULT_ROOM,

      online:
        sockets.length,

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
        .filter(
          (socket) =>
            socket.readyState ===
            WebSocket.OPEN
        )
        .length;


    console.log(
      "Denessa presence:",
      online
    );


    this.broadcast({

      type:
        "presence",

      online,

    });
  }


  // ====================================================
  // BROADCAST
  // ====================================================

  broadcast(
    data
  ) {

    const encoded =
      JSON.stringify(data);


    const sockets =
      this.ctx.getWebSockets();


    for (
      const socket of sockets
    ) {

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
