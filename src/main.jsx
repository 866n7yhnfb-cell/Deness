import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

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
    id: 1,
    author: "Denessa",
    text: "Добро пожаловать в Denessa 🌊",
    time: "18:42",
    mine: false,
  },
  {
    id: 2,
    author: "Вы",
    text: "Привет! Очень красиво здесь.",
    time: "18:43",
    mine: true,
  },
];

function Avatar({ chat, size = "normal" }) {
  return (
    <div className={`chat-avatar ${chat.theme} avatar-${size}`}>
      <span>{chat.avatar}</span>
    </div>
  );
}

function Denessa() {
  const [activeChat, setActiveChat] = useState(null);
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(initialMessages);

  const filteredChats = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return chats;

    return chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(value) ||
        chat.subtitle.toLowerCase().includes(value) ||
        chat.preview.toLowerCase().includes(value)
    );
  }, [search]);

  const currentChat =
    chats.find((chat) => chat.id === activeChat) || null;

  const sendMessage = () => {
    const value = text.trim();

    if (!value) return;

    setMessages((old) => [
      ...old,
      {
        id: Date.now(),
        author: "Вы",
        text: value,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        mine: true,
      },
    ]);

    setText("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="denessa-shell">

      {/* ================= HEADER ================= */}

      <header className="app-header">

        <button className="header-icon" aria-label="Меню">
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
          <span className="online-pulse"></span>
          <span>Онлайн</span>
        </div>

        <button className="profile-avatar">
          J
        </button>

      </header>

      {/* ================= CHAT LIST ================= */}

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

            <button className="new-chat-button">
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
                setSearch(event.target.value)
              }
              placeholder="Поиск по чатам"
            />

          </div>

          <section className="chat-list">

            {filteredChats.map((chat, index) => (
              <button
                key={chat.id}
                className={`chat-card ${
                  index === 0 ? "chat-card-active" : ""
                }`}
                onClick={() => setActiveChat(chat.id)}
              >

                <Avatar chat={chat} />

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
            ))}

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
              onClick={() => setActiveChat(null)}
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
                <i className="tiny-online"></i>
                {currentChat.online
                  ? "1 участник онлайн"
                  : "Канал"}
              </span>

            </div>

            <button className="conversation-action">
              ⋯
            </button>

          </header>

          <section className="messages">

            <div className="date-divider">
              <span>Сегодня</span>
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
                Ваше пространство для общения
                <br />
                в океане идей.
              </p>

            </div>

            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-line ${
                  message.mine ? "message-line-mine" : ""
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
                      <b>✓✓</b>
                    )}
                  </small>

                </div>

              </div>
            ))}

          </section>

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
              disabled={!text.trim()}
              onClick={sendMessage}
            >
              ➤
            </button>

          </footer>

        </main>
      )}

      {/* ================= BOTTOM NAV ================= */}

      {!currentChat && (
        <nav className="bottom-nav">

          <button className="bottom-nav-item active">
            <span>◉</span>
            <small>Чаты</small>
          </button>

          <button className="bottom-nav-item">
            <span>♙</span>
            <small>Контакты</small>
          </button>

          <button className="bottom-nav-item">
            <span>⚙</span>
            <small>Настройки</small>
          </button>

        </nav>
      )}

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
    console.error("Denessa error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <div className="error-anchor">⚓</div>
          <h1>Denessa</h1>
          <p>Произошла ошибка интерфейса.</p>
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

createRoot(
  document.getElementById("root")
).render(
  <DenessaErrorBoundary>
    <Denessa />
  </DenessaErrorBoundary>
);
