import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const ROOM = "denessa-lounge";

const chats = [
  {
    id: "lounge",
    title: "Denessa Lounge",
    subtitle: "Общий канал",
    icon: "⚓",
    type: "ocean",
    online: true,
    active: true,
  },
  {
    id: "captains",
    title: "Капитаны",
    subtitle: "Команда Denessa",
    icon: "✦",
    type: "captains",
  },
  {
    id: "ideas",
    title: "Морские идеи",
    subtitle: "Обсуждения",
    icon: "◓",
    type: "ideas",
  },
];

function Denessa() {
  const [screen, setScreen] = useState("home");
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const bottomRef = useRef(null);

  // --------------------------------------------------
  // WEBSOCKET
  // --------------------------------------------------

  const connect = () => {
    try {
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {}
      }

      const protocol =
        window.location.protocol === "https:" ? "wss:" : "ws:";

      const wsUrl =
        `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(ROOM)}`;

      const socket = new WebSocket(wsUrl);

      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
      };

      socket.onclose = () => {
        setConnected(false);

        clearTimeout(reconnectRef.current);

        reconnectRef.current = setTimeout(() => {
          connect();
        }, 2500);
      };

      socket.onerror = () => {
        setConnected(false);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          let message = data;

          if (data && data.message) {
            message = data.message;
          }

          if (typeof message === "string") {
            message = {
              id: Date.now() + Math.random(),
              text: message,
              author: "Участник",
              mine: false,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
          }

          if (!message || typeof message !== "object") return;

          const normalized = {
            id: message.id || Date.now() + Math.random(),

            text:
              message.text ||
              message.content ||
              message.body ||
              "",

            author:
              message.author ||
              message.username ||
              message.name ||
              "Участник",

            mine: Boolean(
              message.mine ||
              message.isMine
            ),

            time:
              message.time ||
              new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
          };

          if (!normalized.text) return;

          setMessages((old) => {
            const exists = old.some(
              (item) =>
                item.id === normalized.id ||
                (
                  item.text === normalized.text &&
                  item.time === normalized.time
                )
            );

            if (exists) return old;

            return [...old, normalized];
          });
        } catch (error) {
          console.log("Denessa message error:", error);
        }
      };
    } catch (error) {
      console.log("Connection error:", error);
      setConnected(false);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectRef.current);

      try {
        socketRef.current?.close();
      } catch {}
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // --------------------------------------------------
  // SEND
  // --------------------------------------------------

  const sendMessage = () => {
    const value = text.trim();

    if (!value) return;

    const localMessage = {
      id: `${Date.now()}-${Math.random()}`,
      text: value,
      author: "Вы",
      mine: true,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((old) => [...old, localMessage]);
    setText("");

    try {
      const socket = socketRef.current;

      if (
        socket &&
        socket.readyState === WebSocket.OPEN
      ) {
        socket.send(
          JSON.stringify({
            type: "message",
            room: ROOM,
            text: value,
            author: "Вы",
            time: localMessage.time,
            id: localMessage.id,
          })
        );
      }
    } catch (error) {
      console.log("Send error:", error);
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  // --------------------------------------------------
  // FILTER
  // --------------------------------------------------

  const filteredChats = chats.filter((chat) =>
    `${chat.title} ${chat.subtitle}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // --------------------------------------------------
  // CHAT SCREEN
  // --------------------------------------------------

  if (screen === "chat") {
    return (
      <div className="app-shell">

        <header className="top-header chat-top">

          <button
            className="icon-button"
            onClick={() => setScreen("home")}
            aria-label="Назад"
          >
            ‹
          </button>

          <div className="brand-block">

            <div className="brand-avatar">
              D
            </div>

            <div className="brand-text">
              <div className="brand-title">
                Denessa
              </div>

              <div className="brand-subtitle">
                Морской мессенджер
              </div>
            </div>

          </div>

          <div className="connection-pill">
            <span
              className={
                connected
                  ? "connection-dot connected"
                  : "connection-dot"
              }
            />

            <span>
              {connected
                ? "Онлайн"
                : "Подключение"}
            </span>
          </div>

          <div className="profile-avatar">
            J
          </div>

        </header>

        <section className="chat-room-header">

          <div className="room-avatar ocean">
            ⚓
          </div>

          <div className="room-info">

            <div className="room-title">
              Denessa Lounge
            </div>

            <div className="room-status">
              <span className="tiny-online" />
              {connected
                ? "1 участник онлайн"
                : "Подключение..."}
            </div>

          </div>

          <div className="room-actions">

            <button className="round-action">
              ⌕
            </button>

            <button className="round-action">
              •••
            </button>

          </div>

        </section>

        <main className="chat-area">

          {messages.length === 0 ? (
            <div className="chat-empty">

              <div className="empty-logo">
                ⚓
              </div>

              <div className="empty-label">
                DENESSA LOUNGE
              </div>

              <h1>
                Добро пожаловать
                <br />
                в Denessa
              </h1>

              <p>
                Ваше пространство для общения
                <br />
                в океане идей.
              </p>

              <div className="private-label">
                PRIVATE CHANNEL
              </div>

            </div>
          ) : (
            <div className="messages-list">

              <div className="today-label">
                Сегодня
              </div>

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.mine
                      ? "message-row mine"
                      : "message-row"
                  }
                >

                  {!message.mine && (
                    <div className="message-avatar">
                      ⚓
                    </div>
                  )}

                  <div
                    className={
                      message.mine
                        ? "message-bubble mine"
                        : "message-bubble"
                    }
                  >

                    {!message.mine && (
                      <div className="message-author">
                        {message.author}
                      </div>
                    )}

                    <div className="message-content">
                      {message.text}
                    </div>

                    <div className="message-time">
                      {message.time}
                      {message.mine && (
                        <span className="checks">
                          ✓✓
                        </span>
                      )}
                    </div>

                  </div>

                </div>
              ))}

              <div ref={bottomRef} />

            </div>
          )}

        </main>

        <footer className="composer">

          <button
            className="composer-add"
            aria-label="Добавить"
          >
            +
          </button>

          <textarea
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            rows={1}
          />

          <button
            className="composer-send"
            onClick={sendMessage}
            disabled={!text.trim()}
          >
            ➤
          </button>

        </footer>

      </div>
    );
  }

  // --------------------------------------------------
  // HOME SCREEN
  // --------------------------------------------------

  return (
    <div className="app-shell">

      <header className="top-header">

        <button
          className="icon-button menu"
          aria-label="Меню"
        >
          ☰
        </button>

        <div className="brand-block">

          <div className="brand-avatar">
            D
          </div>

          <div className="brand-text">

            <div className="brand-title">
              Denessa
            </div>

            <div className="brand-subtitle">
              Морской мессенджер
            </div>

          </div>

        </div>

        <div className="header-spacer" />

        <div className="online-indicator">
          <span className="online-light" />
        </div>

        <div className="profile-avatar">
          J
        </div>

      </header>

      <main className="home-content">

        <div className="section-heading">

          <div>
            <div className="eyebrow">
              ВАШИ ЧАТЫ
            </div>

            <h1>
              Причал
            </h1>
          </div>

          <button className="new-chat-button">
            +
          </button>

        </div>

        <div className="search-box">

          <span className="search-icon">
            ⌕
          </span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Поиск по чатам"
          />

        </div>

        <div className="chat-list">

          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              className={
                chat.active
                  ? "chat-card active"
                  : "chat-card"
              }
              onClick={() => {
                if (chat.id === "lounge") {
                  setScreen("chat");
                }
              }}
            >

              <div
                className={
                  `chat-card-avatar ${chat.type}`
                }
              >
                {chat.icon}
              </div>

              <div className="chat-card-info">

                <div className="chat-card-title">
                  {chat.title}
                </div>

                <div className="chat-card-subtitle">
                  {chat.subtitle}
                </div>

              </div>

              {chat.active && (
                <div className="chat-card-time">
                  сейчас
                </div>
              )}

            </button>
          ))}

        </div>

        <div className="version-card">

          <div className="version-icon">
            ⚓
          </div>

          <div>

            <div className="version-title">
              Denessa 1.1
            </div>

            <div className="version-subtitle">
              Плывём в онлайн
            </div>

          </div>

          <div className="version-arrow">
            ›
          </div>

        </div>

      </main>

    </div>
  );
}

// --------------------------------------------------
// ERROR BOUNDARY
// --------------------------------------------------

class DenessaErrorBoundary extends React.Component {
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
    console.error("Denessa crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">

          <div className="error-icon">
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

createRoot(
  document.getElementById("root")
).render(
  <DenessaErrorBoundary>
    <Denessa />
  </DenessaErrorBoundary>
);
