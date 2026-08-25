import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

/*
  DENESSA 1.3
  main.jsx

  Главное:
  - красивый морской интерфейс
  - Denessa Lounge
  - отправка сообщений
  - WebSocket с автоматическим переподключением
  - приложение НЕ падает при ошибке WebSocket
  - сообщения сохраняются локально
  - работает на телефоне
*/

const APP_NAME = "Denessa";
const ROOM_NAME = "denessa-lounge";
const STORAGE_KEY = "denessa_messages_v13";
const USER_KEY = "denessa_user_v13";

function createUser() {
  const old = localStorage.getItem(USER_KEY);

  if (old) {
    try {
      return JSON.parse(old);
    } catch {
      // ignore
    }
  }

  const user = {
    id: "user-" + Math.random().toString(36).slice(2, 10),
    name: "Капитан",
    avatar: "J",
  };

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

function loadMessages() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
  } catch {
    // Не позволяем ошибке localStorage сломать приложение
  }
}

function makeMessage(text, user) {
  return {
    id:
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8),

    text,
    author: user.name,
    userId: user.id,
    time: new Date().toISOString(),
    local: true,
  };
}

function formatTime(value) {
  try {
    return new Date(value).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getWebSocketUrl() {
  try {
    const protocol =
      window.location.protocol === "https:" ? "wss:" : "ws:";

    return (
      protocol +
      "//" +
      window.location.host +
      "/ws?room=" +
      encodeURIComponent(ROOM_NAME)
    );
  } catch {
    return null;
  }
}

function App() {
  const [user] = useState(createUser);

  const [messages, setMessages] = useState(loadMessages);

  const [text, setText] = useState("");

  const [connected, setConnected] = useState(false);

  const [connecting, setConnecting] = useState(false);

  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  const socketRef = useRef(null);

  const reconnectTimerRef = useRef(null);

  const reconnectAttemptRef = useRef(0);

  const inputRef = useRef(null);

  const bottomRef = useRef(null);

  const mountedRef = useRef(true);

  /*
    Добавление сообщения безопасно.
  */

  const addMessage = useCallback((message) => {
    if (!message || !message.text) return;

    setMessages((old) => {
      const exists = old.some((item) => item.id === message.id);

      if (exists) return old;

      const next = [...old, message];

      saveMessages(next);

      return next;
    });
  }, []);

  /*
    Обработка входящих сообщений от Worker.
    Мы принимаем несколько возможных форматов,
    чтобы клиент не падал из-за формата сервера.
  */

  const handleServerMessage = useCallback(
    (raw) => {
      try {
        let data = raw;

        if (typeof raw === "string") {
          try {
            data = JSON.parse(raw);
          } catch {
            data = {
              type: "message",
              text: raw,
            };
          }
        }

        if (!data) return;

        /*
          Ping / pong
        */

        if (
          data.type === "ping" ||
          data.type === "pong" ||
          data.type === "connected"
        ) {
          return;
        }

        /*
          Сервер может прислать массив сообщений
        */

        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item?.text) {
              addMessage({
                id:
                  item.id ||
                  Date.now().toString(36) +
                    Math.random().toString(36).slice(2),

                text: String(item.text),

                author:
                  item.author ||
                  item.username ||
                  "Капитан",

                userId: item.userId || "",

                time: item.time || new Date().toISOString(),

                local: false,
              });
            }
          });

          return;
        }

        /*
          Возможные названия события
        */

        const isMessage =
          data.type === "message" ||
          data.type === "chat" ||
          data.type === "new_message" ||
          data.event === "message" ||
          data.event === "new_message" ||
          data.message;

        if (!isMessage) return;

        const payload =
          typeof data.message === "object"
            ? data.message
            : data;

        const incomingText =
          payload.text ||
          payload.content ||
          payload.body ||
          "";

        if (!incomingText) return;

        addMessage({
          id:
            payload.id ||
            data.id ||
            Date.now().toString(36) +
              Math.random().toString(36).slice(2),

          text: String(incomingText),

          author:
            payload.author ||
            payload.username ||
            data.author ||
            "Капитан",

          userId:
            payload.userId ||
            data.userId ||
            "",

          time:
            payload.time ||
            data.time ||
            new Date().toISOString(),

          local: false,
        });
      } catch (err) {
        /*
          Никогда не роняем приложение из-за
          неправильного сообщения сервера.
        */

        console.log("Denessa message error:", err);
      }
    },
    [addMessage]
  );

  /*
    Подключение WebSocket
  */

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    if (socketRef.current) {
      const state = socketRef.current.readyState;

      if (
        state === WebSocket.OPEN ||
        state === WebSocket.CONNECTING
      ) {
        return;
      }
    }

    const wsUrl = getWebSocketUrl();

    if (!wsUrl) return;

    setConnecting(true);

    try {
      const socket = new WebSocket(wsUrl);

      socketRef.current = socket;

      socket.onopen = () => {
        if (!mountedRef.current) return;

        reconnectAttemptRef.current = 0;

        setConnected(true);

        setConnecting(false);

        setError("");

        /*
          Сообщаем серверу, кто мы и в какой комнате.
        */

        try {
          socket.send(
            JSON.stringify({
              type: "join",
              room: ROOM_NAME,
              userId: user.id,
              username: user.name,
            })
          );
        } catch {
          // соединение могло закрыться сразу после открытия
        }
      };

      socket.onmessage = (event) => {
        handleServerMessage(event.data);
      };

      socket.onerror = () => {
        /*
          ВАЖНО:
          не делаем throw.
          Иначе браузер может показать пустую страницу.
        */

        if (!mountedRef.current) return;

        setConnected(false);

        setConnecting(false);

        setError("Соединение временно недоступно");
      };

      socket.onclose = () => {
        if (!mountedRef.current) return;

        setConnected(false);

        setConnecting(false);

        /*
          Автоматическое переподключение.
        */

        const attempt = reconnectAttemptRef.current;

        reconnectAttemptRef.current = attempt + 1;

        const delay = Math.min(
          1000 * Math.pow(1.7, attempt),
          10000
        );

        clearTimeout(reconnectTimerRef.current);

        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch (err) {
      console.log("Denessa WebSocket error:", err);

      setConnected(false);

      setConnecting(false);

      setError("Не удалось подключиться");

      clearTimeout(reconnectTimerRef.current);

      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  }, [handleServerMessage, user.id, user.name]);

  /*
    Запуск подключения
  */

  useEffect(() => {
    mountedRef.current = true;

    connect();

    return () => {
      mountedRef.current = false;

      clearTimeout(reconnectTimerRef.current);

      const socket = socketRef.current;

      if (socket) {
        try {
          socket.close();
        } catch {
          // ignore
        }
      }
    };
  }, [connect]);

  /*
    Прокрутка вниз
  */

  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    });
  }, [messages]);

  /*
    Отправка сообщения
  */

  const sendMessage = useCallback(() => {
    const cleanText = text.trim();

    if (!cleanText) return;

    const message = makeMessage(cleanText, user);

    /*
      Сначала показываем сообщение локально.
      Поэтому даже при временной проблеме сервера
      интерфейс НЕ становится пустым.
    */

    addMessage(message);

    setText("");

    setError("");

    /*
      Отправляем на сервер.
    */

    const socket = socketRef.current;

    if (
      socket &&
      socket.readyState === WebSocket.OPEN
    ) {
      try {
        socket.send(
          JSON.stringify({
            type: "message",

            room: ROOM_NAME,

            id: message.id,

            text: message.text,

            content: message.text,

            author: user.name,

            username: user.name,

            userId: user.id,

            time: message.time,
          })
        );

        return;
      } catch (err) {
        console.log("Send error:", err);
      }
    }

    /*
      Если сервер временно недоступен,
      сообщение остаётся в интерфейсе.
    */

    setError(
      "Сообщение сохранено. Сервер подключится автоматически."
    );
  }, [addMessage, text, user]);

  /*
    Enter отправляет сообщение.
    Shift + Enter позволяет перейти на новую строку.
  */

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      sendMessage();
    }
  };

  /*
    Очистка локальной истории
  */

  const clearChat = () => {
    if (
      window.confirm(
        "Очистить сообщения на этом устройстве?"
      )
    ) {
      setMessages([]);

      localStorage.removeItem(STORAGE_KEY);

      setMenuOpen(false);
    }
  };

  /*
    Стили прямо внутри main.jsx.
    Поэтому старый style.css не сможет сломать интерфейс.
  */

  const styles = {
    app: {
      minHeight: "100vh",
      background:
        "radial-gradient(circle at 50% 0%, #12384a 0%, #071b27 38%, #06151f 100%)",
      color: "#e9f7ff",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },

    header: {
      minHeight: 105,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "22px 28px",
      borderBottom: "1px solid rgba(117,205,231,.16)",
      background: "rgba(5,22,32,.88)",
      backdropFilter: "blur(20px)",
      boxSizing: "border-box",
    },

    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      minWidth: 0,
    },

    menuButton: {
      width: 58,
      height: 58,
      borderRadius: 18,
      border: "1px solid rgba(113,209,238,.25)",
      background: "rgba(20,55,70,.65)",
      color: "#a7d8e9",
      fontSize: 29,
      cursor: "pointer",
      flexShrink: 0,
    },

    logo: {
      width: 60,
      height: 60,
      borderRadius: 20,
      background:
        "linear-gradient(145deg,#77d7e9,#397da8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      fontSize: 34,
      boxShadow:
        "0 10px 30px rgba(32,170,214,.22)",
      flexShrink: 0,
    },

    brand: {
      minWidth: 0,
    },

    brandTitle: {
      fontSize: 30,
      fontWeight: 850,
      letterSpacing: "-.8px",
      whiteSpace: "nowrap",
    },

    brandSub: {
      marginTop: 3,
      fontSize: 15,
      color: "#82aabd",
      fontWeight: 600,
    },

    online: {
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: connected ? "#62e0bb" : "#718797",
      boxShadow: connected
        ? "0 0 16px rgba(98,224,187,.75)"
        : "none",
      marginLeft: 8,
      flexShrink: 0,
    },

    avatar: {
      width: 58,
      height: 58,
      borderRadius: 19,
      background:
        "linear-gradient(145deg,#a9e8f1,#5faec5)",
      color: "#10374a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 27,
      fontWeight: 900,
      flexShrink: 0,
    },

    main: {
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      position: "relative",
    },

    chatHeader: {
      padding: "20px 32px",
      display: "flex",
      alignItems: "center",
      gap: 18,
      borderBottom: "1px solid rgba(117,205,231,.13)",
      background: "rgba(8,31,43,.5)",
    },

    anchor: {
      width: 64,
      height: 64,
      borderRadius: 20,
      background:
        "linear-gradient(145deg,#67c7d9,#327ea2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 32,
      flexShrink: 0,
    },

    chatTitle: {
      fontSize: 25,
      fontWeight: 850,
    },

    chatStatus: {
      marginTop: 5,
      fontSize: 16,
      color: connected ? "#79e4c3" : "#849cab",
      fontWeight: 600,
    },

    messages: {
      flex: 1,
      overflowY: "auto",
      padding: "30px 32px 160px",
      boxSizing: "border-box",
      WebkitOverflowScrolling: "touch",
    },

    welcome: {
      minHeight: 430,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "40px 20px",
    },

    welcomeIcon: {
      fontSize: 62,
      opacity: .72,
      marginBottom: 20,
    },

    welcomeTitle: {
      margin: 0,
      fontSize: "clamp(48px, 11vw, 86px)",
      lineHeight: .96,
      fontWeight: 950,
      letterSpacing: "-3px",
      background:
        "linear-gradient(180deg,#effbff,#76cbe2)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },

    welcomeText: {
      marginTop: 28,
      fontSize: 19,
      color: "#7195a7",
      fontWeight: 650,
    },

    messageRow: {
      display: "flex",
      marginBottom: 16,
    },

    messageBubble: {
      maxWidth: "min(720px, 86%)",
      padding: "13px 17px 10px",
      borderRadius: 20,
      background:
        "linear-gradient(145deg,rgba(22,63,80,.94),rgba(13,43,57,.94))",
      border: "1px solid rgba(106,202,231,.18)",
      boxShadow:
        "0 10px 30px rgba(0,0,0,.13)",
    },

    messageAuthor: {
      fontSize: 13,
      color: "#74d3e6",
      fontWeight: 800,
      marginBottom: 4,
    },

    messageText: {
      fontSize: 17,
      lineHeight: 1.45,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },

    messageTime: {
      marginTop: 5,
      fontSize: 11,
      color: "#718d9b",
      textAlign: "right",
    },

    composer: {
      position: "absolute",
      left: 20,
      right: 20,
      bottom: 18,
      minHeight: 72,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: 9,
      borderRadius: 25,
      background:
        "rgba(7,39,53,.94)",
      border: "1px solid rgba(85,202,234,.28)",
      boxShadow:
        "0 18px 50px rgba(0,0,0,.35)",
      backdropFilter: "blur(25px)",
      boxSizing: "border-box",
    },

    plus: {
      width: 55,
      height: 55,
      border: 0,
      borderRadius: 18,
      background: "rgba(37,90,112,.55)",
      color: "#91e5f4",
      fontSize: 32,
      cursor: "pointer",
      flexShrink: 0,
    },

    input: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 0,
      background: "transparent",
      color: "#eafaff",
      fontSize: 17,
      fontWeight: 600,
      padding: "14px 5px",
    },

    send: {
      width: 55,
      height: 55,
      border: 0,
      borderRadius: 18,
      background:
        "linear-gradient(145deg,#71cfe1,#397fa4)",
      color: "#dffaff",
      fontSize: 24,
      cursor: "pointer",
      flexShrink: 0,
      boxShadow:
        "0 8px 25px rgba(53,175,212,.22)",
    },

    error: {
      position: "absolute",
      left: 28,
      bottom: 100,
      right: 28,
      padding: "9px 14px",
      borderRadius: 12,
      background: "rgba(104,51,43,.85)",
      border: "1px solid rgba(255,148,126,.2)",
      color: "#ffc5b7",
      fontSize: 13,
      textAlign: "center",
      zIndex: 10,
    },

    menu: {
      position: "absolute",
      top: 84,
      right: 20,
      zIndex: 50,
      width: 230,
      borderRadius: 18,
      background: "#102b39",
      border: "1px solid rgba(111,210,235,.2)",
      boxShadow: "0 20px 50px rgba(0,0,0,.45)",
      overflow: "hidden",
    },

    menuItem: {
      width: "100%",
      padding: "16px 18px",
      border: 0,
      background: "transparent",
      color: "#dff6ff",
      textAlign: "left",
      fontSize: 15,
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.menuButton}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Меню"
          >
            ☰
          </button>

          <div style={styles.logo}>D</div>

          <div style={styles.brand}>
            <div style={styles.brandTitle}>
              {APP_NAME}
            </div>

            <div style={styles.brandSub}>
              Морской мессенджер
            </div>
          </div>

          <div style={styles.online} />
        </div>

        <div style={styles.avatar}>
          {user.avatar}
        </div>

        {menuOpen && (
          <div style={styles.menu}>
            <button
              style={styles.menuItem}
              onClick={() => {
                inputRef.current?.focus();
                setMenuOpen(false);
              }}
            >
              ✉️ Написать сообщение
            </button>

            <button
              style={styles.menuItem}
              onClick={() => {
                connect();
                setMenuOpen(false);
              }}
            >
              🔄 Переподключиться
            </button>

            <button
              style={styles.menuItem}
              onClick={clearChat}
            >
              🗑 Очистить историю
            </button>
          </div>
        )}
      </header>

      <main style={styles.main}>
        <div style={styles.chatHeader}>
          <div style={styles.anchor}>⚓</div>

          <div>
            <div style={styles.chatTitle}>
              Denessa Lounge
            </div>

            <div style={styles.chatStatus}>
              <span>
                {connected
                  ? "● Онлайн"
                  : connecting
                  ? "● Подключение..."
                  : "● Оффлайн — переподключаемся"}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.messages}>
          {messages.length === 0 ? (
            <div style={styles.welcome}>
              <div style={styles.welcomeIcon}>⚓</div>

              <h1 style={styles.welcomeTitle}>
                Добро
                <br />
                пожаловать в
                <br />
                Denessa
              </h1>

              <div style={styles.welcomeText}>
                Общайтесь. Создавайте. Плывите дальше.
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    ...styles.messageRow,
                    justifyContent:
                      message.userId === user.id
                        ? "flex-end"
                        : "flex-start",
                  }}
                >
                  <div style={styles.messageBubble}>
                    <div style={styles.messageAuthor}>
                      {message.author ||
                        "Капитан"}
                    </div>

                    <div style={styles.messageText}>
                      {message.text}
                    </div>

                    <div style={styles.messageTime}>
                      {formatTime(message.time)}
                    </div>
                  </div>
                </div>
              ))}

              <div ref={bottomRef} />
            </>
          )}
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <div style={styles.composer}>
          <button
            style={styles.plus}
            onClick={() => inputRef.current?.focus()}
            aria-label="Добавить"
          >
            +
          </button>

          <input
            ref={inputRef}
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            style={styles.input}
            autoComplete="off"
            enterKeyHint="send"
          />

          <button
            style={{
              ...styles.send,
              opacity: text.trim() ? 1 : 0.55,
            }}
            onClick={sendMessage}
            disabled={!text.trim()}
            aria-label="Отправить"
          >
            ➤
          </button>
        </div>
      </main>
    </div>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = `
    <div style="
      min-height:100vh;
      background:#06151f;
      color:#eafaff;
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      padding:30px;
      text-align:center;
    ">
      <div>
        <h2>Denessa</h2>
        <p>Не найден элемент приложения.</p>
      </div>
    </div>
  `;
} else {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
