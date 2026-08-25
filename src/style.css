import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const ROOM = "denessa-lounge";

function Denessa() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);

  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const bottomRef = useRef(null);

  // ==================================================
  // WEBSOCKET
  // ==================================================

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

          if (!message || typeof message !== "object") {
            return;
          }

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

  // ==================================================
  // START
  // ==================================================

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectRef.current);

      try {
        socketRef.current?.close();
      } catch {}
    };
  }, []);

  // ==================================================
  // SCROLL
  // ==================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 60);

    return () => clearTimeout(timer);
  }, [messages]);

  // ==================================================
  // SEND MESSAGE
  // ==================================================

  const sendMessage = () => {
    const value = text.trim();

    if (!value || sending) return;

    setSending(true);

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

    setTimeout(() => {
      setSending(false);
    }, 150);
  };

  // ==================================================
  // ENTER
  // ==================================================

  const handleKeyDown = (event) => {
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
    <div className="denessa-app">

      {/* ============================================
          TOP HEADER
      ============================================ */}

      <header className="topbar">

        <div className="topbar-inner">

          <button
            className="menu-button"
            type="button"
            aria-label="Меню"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="brand">

            <div className="brand-logo">
              D
            </div>

            <div className="brand-copy">

              <div className="brand-name">
                Denessa
              </div>

              <div className="brand-subtitle">
                Private ocean
              </div>

            </div>

          </div>

          <div className="topbar-right">

            <div className="online-status">

              <span
                className={
                  connected
                    ? "status-dot online"
                    : "status-dot"
                }
              />

              <span>
                {connected
                  ? "Онлайн"
                  : "Подключение"}
              </span>

            </div>

            <div className="profile">
              J
            </div>

          </div>

        </div>

      </header>

      {/* ============================================
          CHAT HEADER
      ============================================ */}

      <section className="chat-header">

        <div className="chat-header-inner">

          <button
            className="back-button"
            type="button"
            onClick={() =>
              window.history.back()
            }
            aria-label="Назад"
          >
            ‹
          </button>

          <div className="chat-avatar">
            ⚓
          </div>

          <div className="chat-info">

            <div className="chat-title">
              Denessa Lounge
            </div>

            <div className="chat-members">

              <span className="small-dot" />

              <span>
                {connected
                  ? "1 участник онлайн"
                  : "Подключение..."}
              </span>

            </div>

          </div>

          <div className="chat-actions">

            <button
              className="chat-action"
              type="button"
              aria-label="Поиск"
            >
              ⌕
            </button>

            <button
              className="chat-action"
              type="button"
              aria-label="Ещё"
            >
              •••
            </button>

          </div>

        </div>

      </section>

      {/* ============================================
          MESSAGES
      ============================================ */}

      <main className="messages-area">

        <div className="messages-inner">

          {messages.length === 0 && (
            <div className="welcome">

              <div className="welcome-icon">
                ⚓
              </div>

              <div className="welcome-label">
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

              <div className="welcome-channel">
                PRIVATE CHANNEL
              </div>

            </div>
          )}

          {messages.length > 0 && (
            <div className="today-label">
              Сегодня
            </div>
          )}

          {messages.map((message) => (
            <div
              className={
                message.mine
                  ? "message-row mine"
                  : "message-row"
              }
              key={message.id}
            >

              {!message.mine && (
                <div className="message-avatar">
                  ⚓
                </div>
              )}

              <div
                className={
                  message.mine
                    ? "message-bubble mine-bubble"
                    : "message-bubble"
                }
              >

                {!message.mine && (
                  <div className="message-author">
                    {message.author}
                  </div>
                )}

                <div className="message-text">
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

      </main>

      {/* ============================================
          MESSAGE COMPOSER
      ============================================ */}

      <footer className="composer">

        <div className="composer-inner">

          <button
            className="add-button"
            type="button"
            aria-label="Добавить"
          >
            +
          </button>

          <textarea
            className="message-input"
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            rows={1}
            enterKeyHint="send"
          />

          <button
            className="send-button"
            type="button"
            onClick={sendMessage}
            disabled={
              !text.trim() || sending
            }
            aria-label="Отправить"
          >
            ➤
          </button>

        </div>

      </footer>

    </div>
  );
}

// ==================================================
// ERROR BOUNDARY
// ==================================================

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
      "Denessa crashed:",
      error
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#061923",
            color: "#eefaff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            padding: "30px",
            textAlign: "center",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >

          <div
            style={{
              fontSize: "58px",
              marginBottom: "18px",
            }}
          >
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
            style={{
              marginTop: "20px",
              padding: "14px 24px",
              borderRadius: "14px",
              border: "none",
              background: "#4db5d4",
              color: "#061923",
              fontSize: "16px",
              fontWeight: "700",
            }}
          >
            Перезагрузить Denessa
          </button>

        </div>
      );
    }

    return this.props.children;
  }
}

// ==================================================
// MOUNT
// ==================================================

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Denessa: элемент #root не найден."
  );
}

createRoot(rootElement).render(
  <DenessaErrorBoundary>
    <Denessa />
  </DenessaErrorBoundary>
);
