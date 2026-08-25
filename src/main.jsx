Denessa — новый main.jsx

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
            mine: Boolean(message.mine || message.isMine),
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
                (item.text === normalized.text &&
                  item.time === normalized.time)
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
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [messages]);
  const sendMessage = () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const localMessage = {
      id: `${Date.now()}-${Math.random()}`,
      text: value,
      author: "Вы",
      mine: true,
      time,
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
            time,
            id: localMessage.id,
          })
        );
      }
    } catch (error) {
      console.log("Send error:", error);
    }
    setTimeout(() => {
      setSending(false);
    }, 150);
  };
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };
  return (
    <div className="denessa-app">
      {/* HEADER */}
      <header className="app-header">
        <button className="icon-button menu-button" aria-label="Меню">
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
            <div className="brand-name">
              Denessa
            </div>
            <div className="brand-subtitle">
              Морской мессенджер
            </div>
          </div>
        </div>
        <div className="header-actions">
          <div className="connection">
            <span
              className={
                connected
                  ? "connection-dot online"
                  : "connection-dot"
              }
            />
            <span>
              {connected ? "Онлайн" : "Подключение"}
            </span>
          </div>
          <button className="profile-avatar">
            J
          </button>
        </div>
      </header>
      {/* CHAT LIST */}
      <main className="chat-list">
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
            type="text"
            placeholder="Поиск по чатам"
            aria-label="Поиск по чатам"
          />
        </div>
        <button className="chat-card active">
          <div className="chat-avatar anchor-avatar">
            ⚓
          </div>
          <div className="chat-info">
            <div className="chat-name">
              Denessa Lounge
            </div>
            <div className="chat-preview">
              Общий канал
            </div>
          </div>
          <div className="chat-time">
            сейчас
          </div>
        </button>
        <button className="chat-card">
          <div className="chat-avatar captain-avatar">
            ✦
          </div>
          <div className="chat-info">
            <div className="chat-name">
              Капитаны
            </div>
            <div className="chat-preview">
              Команда Denessa
            </div>
          </div>
        </button>
        <button className="chat-card">
          <div className="chat-avatar ideas-avatar">
            ◯
          </div>
          <div className="chat-info">
            <div className="chat-name">
              Морские идеи
            </div>
            <div className="chat-preview">
              Обсуждения
            </div>
          </div>
        </button>
        <div className="version-card">
          <div className="version-avatar">
            ⚓
          </div>
          <div>
            <strong>Denessa 1.1</strong>
            <span>Плывём в онлайн</span>
          </div>
        </div>
      </main>
      {/* COMPOSER */}
      <footer className="composer">
        <button
          className="composer-add"
          aria-label="Добавить"
        >
          +
        </button>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишите сообщение..."
          rows={1}
        />
        <button
          className="composer-send"
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          aria-label="Отправить"
        >
          ➤
        </button>
      </footer>
      {/* INVISIBLE CHAT DATA / FUTURE CHAT SCREEN */}
      <div className="message-storage" aria-hidden="true">
        {messages.length > 0 && (
          <span>{messages.length}</span>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
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
          <h1>Denessa</h1>
          <p>
            Произошла ошибка интерфейса.
          </p>
          <button
            onClick={() => window.location.reload()}
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
const root = document.getElementById("root");
createRoot(root).render(
  <DenessaErrorBoundary>
    <Denessa />
  </DenessaErrorBoundary>
);
