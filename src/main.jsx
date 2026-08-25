import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createRoot } from "react-dom/client";
import "./style.css";

const ROOM = "denessa-lounge";

const chats = [
  {
    id: "lounge",
    name: "Denessa Lounge",
    subtitle: "Общий канал",
    preview: "Добро пожаловать в Denessa",
    time: "сейчас",
    avatar: "⚓",
    theme: "ocean",
    online: true,
  },
  {
    id: "captains",
    name: "Капитаны",
    subtitle: "Команда Denessa",
    preview: "Новые идеи уже здесь",
    time: "12:42",
    avatar: "✦",
    theme: "captain",
    online: true,
  },
  {
    id: "ideas",
    name: "Морские идеи",
    subtitle: "Обсуждения",
    preview: "Обсудим новый маршрут?",
    time: "11:28",
    avatar: "◯",
    theme: "ideas",
    online: false,
  },
];

const initialMessages = [
  {
    id: "welcome-denessa",
    author: "Denessa",
    text: "Добро пожаловать в Denessa 🌊",
    time: "18:42",
    mine: false,
  },
];

function Avatar({ chat, size = "normal" }) {
  return (
    <div
      className={`chat-avatar ${chat.theme} avatar-${size}`}
    >
      <span>{chat.avatar}</span>
    </div>
  );
}

function Denessa() {
  const [activeChat, setActiveChat] = useState(null);

  const [search, setSearch] = useState("");

  const [text, setText] = useState("");

  const [messages, setMessages] =
    useState(initialMessages);

  const [connected, setConnected] =
    useState(false);

  const [onlineCount, setOnlineCount] =
    useState(0);

  const [connecting, setConnecting] =
    useState(false);

  const socketRef =
    useRef(null);

  const reconnectTimerRef =
    useRef(null);

  const bottomRef =
    useRef(null);

  const clientIdRef =
    useRef(
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`
    );

  // ==================================================
  // FILTER CHATS
  // ==================================================

  const filteredChats = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return chats;
    }

    return chats.filter(
      (chat) =>
        chat.name
          .toLowerCase()
          .includes(value) ||
        chat.subtitle
          .toLowerCase()
          .includes(value) ||
        chat.preview
          .toLowerCase()
          .includes(value)
    );
  }, [search]);

  const currentChat =
    chats.find(
      (chat) => chat.id === activeChat
    ) || null;

  // ==================================================
  // WEBSOCKET URL
  // ==================================================

  const getWebSocketUrl = () => {
    const protocol =
      window.location.protocol === "https:"
        ? "wss:"
        : "ws:";

    return (
      `${protocol}//${window.location.host}` +
      `/ws?room=${encodeURIComponent(ROOM)}` +
      `&username=${encodeURIComponent("Вы")}` +
      `&client=${encodeURIComponent(clientIdRef.current)}`
    );
  };

  // ==================================================
  // CONNECT
  // ==================================================

  const connectWebSocket = () => {
    if (
      socketRef.current &&
      (
        socketRef.current.readyState ===
          WebSocket.OPEN ||
        socketRef.current.readyState ===
          WebSocket.CONNECTING
      )
    ) {
      return;
    }

    setConnecting(true);

    try {
      const socket =
        new WebSocket(
          getWebSocketUrl()
        );

      socketRef.current = socket;

      // ------------------------------------------------
      // OPEN
      // ------------------------------------------------

      socket.onopen = () => {
        console.log(
          "Denessa WebSocket connected"
        );

        setConnected(true);
        setConnecting(false);

        if (
          reconnectTimerRef.current
        ) {
          clearTimeout(
            reconnectTimerRef.current
          );

          reconnectTimerRef.current =
            null;
        }
      };

      // ------------------------------------------------
      // MESSAGE
      // ------------------------------------------------

      socket.onmessage = (event) => {
        try {
          const data =
            JSON.parse(event.data);

          // --------------------------------------------
          // HISTORY
          // --------------------------------------------

          if (
            data.type === "history"
          ) {
            if (
              Array.isArray(
                data.messages
              )
            ) {
              setMessages(
                data.messages.map(
                  (message) => ({
                    ...message,
                    mine: false,
                  })
                )
              );
            }

            return;
          }

          // --------------------------------------------
          // NEW MESSAGE
          // --------------------------------------------

          if (
            data.type === "message" &&
            data.message
          ) {
            const incoming =
              data.message;

            const normalized = {
              id:
                incoming.id ||
                `${Date.now()}-${Math.random()}`,

              author:
                incoming.author ||
                "Участник",

              text:
                incoming.text ||
                "",

              time:
                incoming.time ||
                new Date().toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                ),

              /*
               * Worker рассылает сообщение
               * всем пользователям.
               *
               * Если это наше собственное
               * сообщение — отмечаем его
               * как mine.
               */
              mine:
                incoming.clientId ===
                clientIdRef.current,
            };

            if (
              !normalized.text
            ) {
              return;
            }

            setMessages(
              (oldMessages) => {
                const exists =
                  oldMessages.some(
                    (item) =>
                      item.id ===
                      normalized.id
                  );

                if (exists) {
                  return oldMessages;
                }

                return [
                  ...oldMessages,
                  normalized,
                ];
              }
            );

            return;
          }

          // --------------------------------------------
          // PRESENCE
          // --------------------------------------------

          if (
            data.type === "presence"
          ) {
            setOnlineCount(
              Number(data.online) || 0
            );

            return;
          }

          // --------------------------------------------
          // ERROR
          // --------------------------------------------

          if (
            data.type === "error"
          ) {
            console.error(
              "Denessa server error:",
              data.message
            );

            return;
          }
        } catch (error) {
          console.error(
            "Denessa message parse error:",
            error
          );
        }
      };

      // ------------------------------------------------
      // CLOSE
      // ------------------------------------------------

      socket.onclose = () => {
        console.log(
          "Denessa WebSocket disconnected"
        );

        setConnected(false);
        setConnecting(false);

        socketRef.current = null;

        if (
          reconnectTimerRef.current
        ) {
          clearTimeout(
            reconnectTimerRef.current
          );
        }

        reconnectTimerRef.current =
          setTimeout(() => {
            connectWebSocket();
          }, 2500);
      };

      // ------------------------------------------------
      // ERROR
      // ------------------------------------------------

      socket.onerror = (error) => {
        console.error(
          "Denessa WebSocket error:",
          error
        );

        setConnected(false);
        setConnecting(false);
      };
    } catch (error) {
      console.error(
        "Denessa connection error:",
        error
      );

      setConnected(false);
      setConnecting(false);

      reconnectTimerRef.current =
        setTimeout(() => {
          connectWebSocket();
        }, 2500);
    }
  };

  // ==================================================
  // INITIAL CONNECTION
  // ==================================================

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (
        reconnectTimerRef.current
      ) {
        clearTimeout(
          reconnectTimerRef.current
        );
      }

      try {
        socketRef.current?.close();
      } catch {}

      socketRef.current =
        null;
    };
  }, []);

  // ==================================================
  // SCROLL TO BOTTOM
  // ==================================================

  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  }, [messages]);

  // ==================================================
  // SEND MESSAGE
  // ==================================================

  const sendMessage = () => {
    const value =
      text.trim();

    if (!value) {
      return;
    }

    const socket =
      socketRef.current;

    // ------------------------------------------------
    // If connected — send to server
    // ------------------------------------------------

    if (
      socket &&
      socket.readyState ===
        WebSocket.OPEN
    ) {
      const localId =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

      const time =
        new Date().toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );

      const payload = {
        type: "message",

        room: ROOM,

        id: localId,

        clientId:
          clientIdRef.current,

        author: "Вы",

        text: value,

        time,
      };

      try {
        socket.send(
          JSON.stringify(payload)
        );

        /*
         * Добавляем сообщение локально
         * сразу, чтобы интерфейс был
         * моментальным.
         */
        setMessages(
          (oldMessages) => [
            ...oldMessages,
            {
              id: localId,
              author: "Вы",
              text: value,
              time,
              mine: true,
            },
          ]
        );

        setText("");
      } catch (error) {
        console.error(
          "Denessa send error:",
          error
        );
      }

      return;
    }

    // ------------------------------------------------
    // Offline fallback
    // ------------------------------------------------

    const offlineMessage = {
      id:
        `${Date.now()}-offline`,
      author: "Вы",
      text: value,
      time:
        new Date().toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        ),
      mine: true,
    };

    setMessages(
      (oldMessages) => [
        ...oldMessages,
        offlineMessage,
      ]
    );

    setText("");

    console.log(
      "Denessa: сообщение сохранено локально. Сервер пока недоступен."
    );
  };

  // ==================================================
  // ENTER
  // ==================================================

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="denessa-shell">

      {/* ================= HEADER ================= */}

      <header className="app-header">

        <button
          className="header-icon"
          aria-label="Меню"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className="brand">

          <div className="brand-mark">
            D
          </div>

          <div className="brand-copy">

            <div className="brand-name">
              Denessa
            </div>

            <div className="brand-subtitle">
              Морской мессенджер
            </div>

          </div>

        </div>

        <div className="header-online">

          <span
            className={
              connected
                ? "online-pulse"
                : "online-pulse offline"
            }
          />

          <span>
            {connected
              ? "Онлайн"
              : connecting
              ? "Подключение..."
              : "Офлайн"}
          </span>

        </div>

        <button
          className="profile-avatar"
        >
          J
        </button>

      </header>

      {/* ================= HOME ================= */}

      {!currentChat && (
        <main className="home-screen">

          <section className="welcome-section">

            <div>

              <div className="section-label">
                ВАШИ ЧАТЫ
              </div>

              <h1 className="page-title">
                Причал
              </h1>

            </div>

            <button
              className="new-chat-button"
            >
              +
            </button>

          </section>

          <div className="search-box">

            <span className="search-icon">
              ⌕
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Поиск по чатам"
            />

          </div>

          <section className="chat-list">

            {filteredChats.map(
              (chat, index) => (
                <button
                  key={chat.id}
                  className={`chat-card ${
                    index === 0
                      ? "chat-card-active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveChat(
                      chat.id
                    )
                  }
                >

                  <Avatar
                    chat={chat}
                  />

                  <div className="chat-card-content">

                    <div className="chat-card-top">

                      <strong>
                        {chat.name}
                      </strong>

                      <span>
                        {chat.time}
                      </span>

                    </div>

                    <div className="chat-card-bottom">

                      <span>
                        {chat.preview}
                      </span>

                      {chat.online && (
                        <i className="tiny-online"></i>
                      )}

                    </div>

                  </div>

                </button>
              )
            )}

          </section>

          <div className="version-card">

            <div className="version-avatar">
              ⚓
            </div>

            <div>

              <strong>
                Denessa 1.3
              </strong>

              <span>
                Плывём в будущее
              </span>

            </div>

            <span className="version-arrow">
              ›
            </span>

          </div>

        </main>
      )}

      {/* ================= CHAT ================= */}

      {currentChat && (
        <main className="chat-screen">

          <header className="conversation-header">

            <button
              className="back-button"
              onClick={() =>
                setActiveChat(null)
              }
            >
              ‹
            </button>

            <Avatar
              chat={currentChat}
              size="small"
            />

            <div className="conversation-info">

              <strong>
                {currentChat.name}
              </strong>

              <span>

                <i
                  className={
                    connected
                      ? "tiny-online"
                      : "tiny-online offline-dot"
                  }
                />

                {connected
                  ? `${Math.max(
                      onlineCount,
                      1
                    )} ${
                      Math.max(
                        onlineCount,
                        1
                      ) === 1
                        ? "участник"
                        : "участников"
                    } онлайн`
                  : "Подключение..."}

              </span>

            </div>

            <button
              className="conversation-action"
            >
              ⋯
            </button>

          </header>

          <section className="messages">

            <div className="date-divider">
              <span>
                Сегодня
              </span>
            </div>

            <div className="conversation-welcome">

              <div className="large-anchor">
                ⚓
              </div>

              <div className="channel-name">
                DENESSA LOUNGE
              </div>

              <h2>
                Добро пожаловать
                <br />
                в Denessa
              </h2>

              <p>
                Ваше пространство для
                общения
                <br />
                в океане идей.
              </p>

            </div>

            {messages.map(
              (message) => (
                <div
                  key={message.id}
                  className={`message-line ${
                    message.mine
                      ? "message-line-mine"
                      : ""
                  }`}
                >

                  {!message.mine && (
                    <div className="message-mini-avatar">
                      ⚓
                    </div>
                  )}

                  <div
                    className={`message ${
                      message.mine
                        ? "message-mine"
                        : "message-other"
                    }`}
                  >

                    {!message.mine && (
                      <strong>
                        {message.author}
                      </strong>
                    )}

                    <span className="message-content">
                      {message.text}
                    </span>

                    <small>

                      {message.time}

                      {message.mine && (
                        <b>
                          ✓✓
                        </b>
                      )}

                    </small>

                  </div>

                </div>
              )
            )}

            <div
              ref={bottomRef}
            />

          </section>

          <footer className="composer">

            <button
              className="add-button"
              type="button"
            >
              +
            </button>

            <textarea
              value={text}
              onChange={(event) =>
                setText(
                  event.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Напишите сообщение..."
              rows={1}
            />

            <button
              className="send-button"
              disabled={!text.trim()}
              onClick={sendMessage}
              type="button"
            >
              ➤
            </button>

          </footer>

        </main>
      )}

      {/* ================= BOTTOM NAV ================= */}

      {!currentChat && (
        <nav className="bottom-nav">

          <button
            className="bottom-nav-item active"
          >
            <span>◉</span>
            <small>
              Чаты
            </small>
          </button>

          <button
            className="bottom-nav-item"
          >
            <span>♙</span>
            <small>
              Контакты
            </small>
          </button>

          <button
            className="bottom-nav-item"
          >
            <span>⚙</span>
            <small>
              Настройки
            </small>
          </button>

        </nav>
      )}

    </div>
  );
}

// ======================================================
// ERROR BOUNDARY
// ======================================================

class DenessaErrorBoundary
  extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error) {
    console.error(
      "Denessa error:",
      error
    );
  }

  render() {
    if (
      this.state.hasError
    ) {
      return (
        <div className="error-screen">

          <div className="error-anchor">
            ⚓
          </div>

          <h1>
            Denessa
          </h1>

          <p>
            Произошла ошибка интерфейса.
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
          >
            Перезагрузить
          </button>

        </div>
      );
    }

    return this.props.children;
  }
}

// ======================================================
// START
// ======================================================

createRoot(
  document.getElementById("root")
).render(
  <DenessaErrorBoundary>
    <Denessa />
  </DenessaErrorBoundary>
);
