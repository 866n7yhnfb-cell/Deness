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

            mine:
              Boolean(
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

  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  }, [messages]);

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

    setMessages((old) => [...old, localMessage]);
    setText("");

    try {
      const socket = socketRef.current;

      if (
        socket &&
        socket.readyState === WebSocket.OPEN
      ) {
        const payload = {
          type: "message",
          room: ROOM,
          text: value,
          author: "Вы",
          time: localMessage.time,
          id: localMessage.id,
        };

        socket.send(JSON.stringify(payload));
      }
    } catch (error) {
      console.log("Denessa send error:", error);
    }

    setTimeout(() => {
      setSending(false);
    }, 150);
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

  return (
    <div className="denessa-app">

      {/* TOP BAR */}

      <header className="topbar">

        <button className="menu-button">
          <span />
          <span />
          <span />
        </button>

        <div className="brand">

          <div className="brand-logo">
            <span>D</span>
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

        <div className="top-actions">

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

          <button className="profile-button">
            J
          </button>

        </div>

      </header>


      {/* CHAT HEADER */}

      <section className="chat-header">

        <div className="chat-header-left">

          <button className="back-button">
            ‹
          </button>

          <div className="chat-icon">
            ⚓
          </div>

          <div className="chat-title-area">

            <div className="chat-title">
              Denessa Lounge
            </div>

            <div className="chat-members">

              <span className="small-dot" />

              {connected
                ? "1 участник онлайн"
                : "Подключение..."}

            </div>

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

      </section>


      {/* CHAT */}

      <main className="messages-area">

        {messages.length === 0 && (

          <div className="welcome">

            <div className="welcome-glow" />

            <div className="welcome-anchor">
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

            <div className="welcome-line">
              <span />
              <span>PRIVATE CHANNEL</span>
              <span />
            </div>

          </div>

        )}


        {messages.length > 0 && (

          <div className="message-date">
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

              <div className="message-footer">

                <span className="message-time">
                  {message.time}
                </span>

                {message.mine && (
                  <span className="message-check">
                    ✓✓
                  </span>
                )}

              </div>

            </div>

          </div>

        ))}

        <div ref={bottomRef} />

      </main>


      {/* COMPOSER */}

      <footer className="composer">

        <button className="composer-add">
          +
        </button>

        <div className="composer-input">

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
              ? "send-button active"
              : "send-button"
          }
          onClick={sendMessage}
          disabled={
            !text.trim() ||
            sending
          }
        >
          ➤
        </button>

      </footer>


      {/* BOTTOM DECORATION */}

      <div className="ocean-glow" />

    </div>
  );
}


/* ERROR PROTECTION */

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
        <div className="denessa-error">

          <div className="error-anchor">
            ⚓
          </div>

          <div className="error-logo">
            D
          </div>

          <h1>
            Denessa
          </h1>

          <p>
            Произошла небольшая ошибка.
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
