import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const ROOM = "denessa-lounge";

const chats = [
  {
    id: "denessa-lounge",
    title: "Denessa Lounge",
    subtitle: "Общий канал",
    icon: "⚓",
    type: "ocean",
  },
  {
    id: "captains",
    title: "Капитаны",
    subtitle: "Команда Denessa",
    icon: "✦",
    type: "blue",
  },
  {
    id: "ideas",
    title: "Морские идеи",
    subtitle: "Обсуждения",
    icon: "◯",
    type: "gold",
  },
];

function Denessa() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [activeChat, setActiveChat] = useState("denessa-lounge");

  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const bottomRef = useRef(null);

  const activeRoom = chats.find((chat) => chat.id === activeChat);

  // --------------------------------------------
  // WEBSOCKET
  // --------------------------------------------

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

          let message = data?.message || data;

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
            id:
              message.id ||
              Date.now() + Math.random(),

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
      console.log("Denessa connection error:", error);
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

  // --------------------------------------------
  // SCROLL
  // --------------------------------------------

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // --------------------------------------------
  // SEND
  // --------------------------------------------

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

      if (socket && socket.readyState === WebSocket.OPEN) {
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

  // --------------------------------------------
  // UI
  // --------------------------------------------

  return (
    <div className="denessa">

      {/* -------------------------------------- */}
      {/* TOP HEADER */}
      {/* -------------------------------------- */}

      <header className="top-header">

        <button className="icon-button menu-button">
          <span className="menu-lines">
            <i />
            <i />
            <i />
          </span>
        </button>

        <div className="brand">

          <div className="brand-avatar">
            D
          </div>

          <div className="brand-copy">
            <div className="brand-title">
              Denessa
            </div>

            <div className="brand-subtitle">
              Морской мессенджер
            </div>
          </div>

        </div>

        <div className="header-spacer" />

        <div
          className={
            connected
              ? "connection online"
              : "connection"
          }
        >
          <span className="connection-dot" />
          <span>
            {connected ? "Онлайн" : "Подключение"}
          </span>
        </div>

        <div className="profile-avatar">
          J
        </div>

      </header>

      {/* -------------------------------------- */}
      {/* MAIN */}
      {/* -------------------------------------- */}

      <main className="main-layout">

        {/* ------------------------------------ */}
        {/* CHAT LIST */}
        {/* ------------------------------------ */}

        <aside className="chat-sidebar">

          <div className="sidebar-heading">

            <div>
              <div className="eyebrow">
                ВАШИ ЧАТЫ
              </div>

              <h1>
                Причал
              </h1>
            </div>

            <button className="add-chat">
              +
            </button>

          </div>

          <div className="search-box">

            <span className="search-icon">
              ⌕
            </span>

            <input
              placeholder="Поиск по чатам"
            />

          </div>

          <div className="chat-list">

            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() =>
                  setActiveChat(chat.id)
                }
                className={
                  activeChat === chat.id
                    ? "chat-item active"
                    : "chat-item"
                }
              >

                <div
                  className={`chat-avatar ${chat.type}`}
                >
                  {chat.icon}
                </div>

                <div className="chat-info">

                  <div className="chat-name">
                    {chat.title}
                  </div>

                  <div className="chat-description">
                    {chat.subtitle}
                  </div>

                </div>

                {activeChat === chat.id && (
                  <span className="chat-active-dot" />
                )}

              </button>
            ))}

          </div>

          <div className="sidebar-bottom">

            <div className="version-card">

              <div className="version-icon">
                ⚓
              </div>

              <div>
                <strong>
                  Denessa 1.1
                </strong>

                <span>
                  Плывём в онлайн
                </span>
              </div>

            </div>

          </div>

        </aside>

        {/* ------------------------------------ */}
        {/* CHAT */}
        {/* ------------------------------------ */}

        <section className="chat-panel">

          <header className="chat-topbar">

            <button
              className="chat-back"
              onClick={() =>
                window.history.back()
              }
            >
              ‹
            </button>

            <div className="chat-avatar large ocean">
              ⚓
            </div>

            <div className="chat-heading">

              <div className="chat-heading-title">
                {activeRoom?.title || "Denessa Lounge"}
              </div>

              <div className="chat-heading-status">

                <span />

                {connected
                  ? "1 участник онлайн"
                  : "Подключение..."}

              </div>

            </div>

            <div className="chat-actions">

              <button className="chat-action">
                ⌕
              </button>

              <button className="chat-action">
                •••
              </button>

            </div>

          </header>

          {/* ---------------------------------- */}
          {/* MESSAGES */}
          {/* ---------------------------------- */}

          <div className="messages">

            <div className="today">
              Сегодня
            </div>

            {messages.length === 0 && (
              <div className="empty-chat">

                <div className="empty-orb">

                  <div className="empty-anchor">
                    ⚓
                  </div>

                </div>

                <div className="empty-label">
                  DENESSA LOUNGE
                </div>

                <h2>
                  Добро пожаловать
                  <br />
                  в Denessa
                </h2>

                <p>
                  Ваше пространство для общения
                  <br />
                  в океане идей.
                </p>

                <span className="private-channel">
                  PRIVATE CHANNEL
                </span>

              </div>
            )}

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
                  <div className="message-mini-avatar">
                    ⚓
                  </div>
                )}

                <div
                  className={
                    message.mine
                      ? "bubble mine-bubble"
                      : "bubble"
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

                  <div className="message-meta">
                    <span>
                      {message.time}
                    </span>

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

          {/* ---------------------------------- */}
          {/* COMPOSER */}
          {/* ---------------------------------- */}

          <footer className="composer">

            <button className="composer-add">
              +
            </button>

            <div className="composer-field">

              <textarea
                value={text}
                onChange={(event) =>
                  setText(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Напишите сообщение..."
                rows={1}
              />

            </div>

            <button
              className={
                text.trim()
                  ? "composer-send ready"
                  : "composer-send"
              }
              onClick={sendMessage}
              disabled={!text.trim()}
            >
              ➤
            </button>

          </footer>

        </section>

      </main>

    </div>
  );
}

// ----------------------------------------------
// ERROR BOUNDARY
// ----------------------------------------------

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
      "Denessa crashed:",
      error
    );
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
            Перезагрузить Denessa
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
