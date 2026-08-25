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

  // --------------------------------------------------
  // WebSocket
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

  // --------------------------------------------------
  // Start
  // --------------------------------------------------

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectRef.current);

      try {
        socketRef.current?.close();
      } catch {}
    };
  }, []);

  // --------------------------------------------------
  // Scroll
  // --------------------------------------------------

  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  }, [messages]);

  // --------------------------------------------------
  // Send
  // --------------------------------------------------

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

    // ВАЖНО:
    // Сначала показываем сообщение локально.
    // Поэтому ошибка сервера не сможет удалить экран.
    setMessages((old) => [...old, localMessage]);
    setText("");

    try {
      const socket = socketRef.current;

      if (socket && socket.readyState === WebSocket.OPEN) {
        const payload = {
          type: "message",
          room: ROOM,
          text: value,
          author: "Вы",
          time: localMessage.time,
          id: localMessage.id,
        };

        socket.send(JSON.stringify(payload));
      } else {
        console.log(
          "WebSocket пока не подключён. Сообщение сохранено локально."
        );
      }
    } catch (error) {
      console.log("Send error:", error);
    }

    setTimeout(() => {
      setSending(false);
    }, 150);
  };

  // --------------------------------------------------
  // Enter
  // --------------------------------------------------

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="denessa-app">

      <header className="topbar">

        <button className="menu-button">
          ☰
        </button>

        <div className="brand">

          <div className="brand-logo">
            D
          </div>

          <div>
            <div className="brand-name">
              Denessa
            </div>

            <div className="brand-subtitle">
              Морской мессенджер
            </div>
          </div>

        </div>

        <div className="online-status">
          <span
            className={
              connected
                ? "status-dot online"
                : "status-dot"
            }
          />

          <span className="status-text">
            {connected ? "онлайн" : "подключение"}
          </span>
        </div>

        <div className="profile">
          J
        </div>

      </header>

      <section className="chat-header">

        <button
          className="back-button"
          onClick={() => window.history.back()}
        >
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

        <button className="more-button">
          •••
        </button>

      </section>

      <main className="messages-area">

        {messages.length === 0 && (
          <div className="welcome">

            <div className="welcome-anchor">
              ⚓
            </div>

            <h1>
              Добро пожаловать
              <br />
              в Denessa
            </h1>

            <p>
              Общайтесь. Создавайте.
              Плывите дальше.
            </p>

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

              <div className="message-time">
                {message.time}
              </div>

            </div>

          </div>
        ))}

        <div ref={bottomRef} />

      </main>

      <footer className="composer">

        <button className="add-button">
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
          className="send-button"
          onClick={sendMessage}
          disabled={!text.trim() || sending}
        >
          ➤
        </button>

      </footer>

    </div>
  );
}

// --------------------------------------------------
// Error protection
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
        <div
          style={{
            minHeight: "100vh",
            background: "#061925",
            color: "#eaf8ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            padding: "30px",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              marginBottom: "20px",
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
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px",
              padding: "14px 24px",
              borderRadius: "14px",
              border: "none",
              background: "#4faed0",
              color: "white",
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

createRoot(
  document.getElementById("root")
).render(
  <DenessaErrorBoundary>
    <Denessa />
  </DenessaErrorBoundary>
);
