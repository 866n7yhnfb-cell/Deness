import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const ROOM = "denessa-lounge";

const CHATS = [
  {
    id: "lounge",
    title: "Denessa Lounge",
    subtitle: "Общий чат Denessa",
    icon: "⚓",
  },
  {
    id: "captains",
    title: "Капитаны",
    subtitle: "Команда и участники",
    icon: "✦",
  },
  {
    id: "ideas",
    title: "Морские идеи",
    subtitle: "Идеи и предложения",
    icon: "◈",
  },
];

function Denessa() {
  const [screen, setScreen] = useState("chats");
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const bottomRef = useRef(null);

  /* =========================
     WEBSOCKET
  ========================= */

  const connect = () => {
    try {
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {}
      }

      const protocol =
        window.location.protocol === "https:"
          ? "wss:"
          : "ws:";

      const url =
        `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(ROOM)}`;

      const socket = new WebSocket(url);

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

          let message = data?.message || data;

          if (typeof message === "string") {
            message = {
              text: message,
              author: "Участник",
            };
          }

          if (!message || typeof message !== "object") {
            return;
          }

          const normalized = {
            id:
              message.id ||
              `${Date.now()}-${Math.random()}`,

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

            if (exists) {
              return old;
            }

            return [...old, normalized];
          });
        } catch (error) {
          console.log(
            "Denessa message error:",
            error
          );
        }
      };
    } catch (error) {
      console.log(
        "Denessa connection error:",
        error
      );

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

  /* =========================
     OPEN CHAT
  ========================= */

  const openChat = (chat) => {
    setActiveChat(chat);
    setScreen("chat");
  };

  const goHome = () => {
    setScreen("chats");
    setActiveChat(null);
  };

  /* =========================
     SEND
  ========================= */

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

    setMessages((old) => [
      ...old,
      localMessage,
    ]);

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
      console.log(
        "Denessa send error:",
        error
      );
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

  /* =========================
     SEARCH
  ========================= */

  const filteredChats = CHATS.filter(
    (chat) => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) return true;

      return (
        chat.title
          .toLowerCase()
          .includes(query) ||
        chat.subtitle
          .toLowerCase()
          .includes(query)
      );
    }
  );

  /* =========================
     APP
  ========================= */

  return (
    <div className="denessa-app">

      {/* TOP HEADER */}

      <header className="top-header">

        <div className="top-brand">

          <div className="denessa-logo">
            D
          </div>

          <div className="top-brand-text">

            <strong>
              Denessa
            </strong>

            <span>
              Морской мессенджер
            </span>

          </div>

        </div>

        <div className="top-actions">

          <div className="connection">

            <span
              className={
                connected
                  ? "connection-dot"
                  : "connection-dot offline"
              }
            />

            <span>
              {connected
                ? "Онлайн"
                : "Подключение"}
            </span>

          </div>

          <button
            className="avatar-button"
            onClick={() =>
              setMenuOpen(true)
            }
          >
            J
          </button>

        </div>

      </header>

      {/* CONTENT */}

      <main className="app-content">

        {screen === "chats" && (
          <section className="chats-screen">

            <div className="welcome-heading">

              <div>

                <span className="section-label">
                  ВАШЕ ПРОСТРАНСТВО
                </span>

                <h1>
                  Причал
                </h1>

              </div>

              <button className="new-chat-button">
                +
              </button>

            </div>

            <div className="search-container">

              <span>
                ⌕
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Поиск"
              />

            </div>

            <div className="chats-list">

              {filteredChats.map(
                (chat) => (
                  <button
                    key={chat.id}
                    className="chat-item"
                    onClick={() =>
                      openChat(chat)
                    }
                  >

                    <div className="chat-icon">
                      {chat.icon}
                    </div>

                    <div className="chat-item-info">

                      <strong>
                        {chat.title}
                      </strong>

                      <span>
                        {chat.subtitle}
                      </span>

                    </div>

                    <span className="chat-arrow">
                      ›
                    </span>

                  </button>
                )
              )}

            </div>

            <div className="ocean-card">

              <div className="ocean-card-icon">
                ⚓
              </div>

              <div>

                <strong>
                  Denessa 1.3
                </strong>

                <span>
                  Новая глава начинается здесь
                </span>

              </div>

            </div>

          </section>
        )}

        {screen === "chat" && activeChat && (
          <section className="chat-screen">

            {/* CHAT HEADER */}

            <header className="chat-topbar">

              <button
                className="back-button"
                onClick={goHome}
              >
                ‹
              </button>

              <div className="chat-top-info">

                <div className="chat-top-icon">
                  {activeChat.icon}
                </div>

                <div>

                  <strong>
                    {activeChat.title}
                  </strong>

                  <span>
                    <i
                      className={
                        connected
                          ? "status-small"
                          : "status-small offline"
                      }
                    />

                    {connected
                      ? "1 участник онлайн"
                      : "Подключение..."}
                  </span>

                </div>

              </div>

              <button
                className="more-button"
                onClick={() =>
                  setMenuOpen(true)
                }
              >
                •••
              </button>

            </header>

            {/* MESSAGES */}

            <div className="messages-container">

              {messages.length === 0 ? (
                <div className="empty-state">

                  <div className="empty-logo">
                    ⚓
                  </div>

                  <span>
                    DENESSA LOUNGE
                  </span>

                  <h2>
                    Добро пожаловать
                    <br />
                    в Denessa
                  </h2>

                  <p>
                    Общайтесь, создавайте
                    <br />
                    и плывите дальше.
                  </p>

                </div>
              ) : (
                <>

                  <div className="today-label">
                    Сегодня
                  </div>

                  {messages.map(
                    (message) => (
                      <div
                        key={message.id}
                        className={
                          message.mine
                            ? "message-line mine"
                            : "message-line"
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
                              ? "message mine-message"
                              : "message"
                          }
                        >

                          {!message.mine && (
                            <strong>
                              {message.author}
                            </strong>
                          )}

                          <div>
                            {message.text}
                          </div>

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

                  <div ref={bottomRef} />

                </>
              )}

            </div>

            {/* COMPOSER */}

            <div className="message-composer">

              <button className="composer-plus">
                +
              </button>

              <textarea
                value={text}
                onChange={(event) =>
                  setText(
                    event.target.value
                  )
                }
                onKeyDown={handleKeyDown}
                placeholder="Сообщение..."
                rows={1}
              />

              <button
                className={
                  text.trim()
                    ? "composer-send active"
                    : "composer-send"
                }
                onClick={sendMessage}
                disabled={!text.trim()}
              >
                ➤
              </button>

            </div>

          </section>
        )}

      </main>

      {/* BOTTOM NAV */}

      {screen === "chats" && (
        <nav className="bottom-navigation">

          <button className="nav-item active">

            <span>
              ◉
            </span>

            <small>
              Чаты
            </small>

          </button>

          <button className="nav-item">

            <span>
              ◇
            </span>

            <small>
              Контакты
            </small>

          </button>

          <button className="nav-item">

            <span>
              ⚓
            </span>

            <small>
              Denessa
            </small>

          </button>

          <button
            className="nav-item"
            onClick={() =>
              setMenuOpen(true)
            }
          >

            <span>
              ☰
            </span>

            <small>
              Ещё
            </small>

          </button>

        </nav>
      )}

      {/* MENU */}

      {menuOpen && (
        <div
          className="menu-backdrop"
          onClick={() =>
            setMenuOpen(false)
          }
        >

          <aside
            className="profile-menu"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="menu-profile">

              <div className="menu-avatar">
                J
              </div>

              <div>

                <strong>
                  Ваш профиль
                </strong>

                <span>
                  Denessa member
                </span>

              </div>

            </div>

            <button>
              👤 Профиль
            </button>

            <button>
              🔔 Уведомления
            </button>

            <button>
              ⚙ Настройки
            </button>

            <button>
              🌊 О Denessa
            </button>

            <button
              className="close-menu"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              Закрыть
            </button>

          </aside>

        </div>
      )}

    </div>
  );
}

/* =========================
   ERROR BOUNDARY
========================= */

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
    console.error(
      "Denessa error:",
      error
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">

          <div>
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
