import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const initialChats = [
  { id: "denessa-main", name: "Denessa Lounge", subtitle: "Общий канал", icon: "⚓", color: "aqua", unread: 0 },
  { id: "captains", name: "Капитаны", subtitle: "Команда Denessa", icon: "✦", color: "blue", unread: 0 },
  { id: "sea-ideas", name: "Морские идеи", subtitle: "Обсуждения", icon: "◒", color: "sand", unread: 0 }
];

function makeName() {
  const saved = localStorage.getItem("denessa-name");
  if (saved) return saved;
  const name = `Моряк ${Math.floor(100 + Math.random() * 900)}`;
  localStorage.setItem("denessa-name", name);
  return name;
}

function App() {
  const [name, setName] = useState(makeName);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [activeChat, setActiveChat] = useState(initialChats[0]);
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState(1);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileChats, setMobileChats] = useState(true);
  const socketRef = useRef(null);
  const inputRef = useRef(null);

  const wsUrl = useMemo(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${location.host}/ws?room=${encodeURIComponent(activeChat.id)}&name=${encodeURIComponent(name)}`;
  }, [activeChat.id, name]);

  useEffect(() => {
    setMessages([]);
    setConnected(false);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "hello", name }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "history") {
          setMessages(data.messages || []);
          setOnline(data.online || 1);
        }
        if (data.type === "message") {
          setMessages((old) => [...old, data.message].slice(-100));
        }
        if (data.type === "presence") setOnline(data.online || 1);
      } catch {}
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => ws.close();
  }, [wsUrl]);

  function sendMessage() {
    const value = text.trim();
    if (!value || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: "message", text: value, name }));
    setText("");
    inputRef.current?.focus();
  }

  function saveName() {
    const next = draftName.trim().slice(0, 24);
    if (!next) return;
    localStorage.setItem("denessa-name", next);
    setName(next);
    setDraftName(next);
    setEditingName(false);
  }

  function selectChat(chat) {
    setActiveChat(chat);
    setMobileChats(false);
  }

  return (
    <div className="app">
      <div className="ocean-glow glow-one" />
      <div className="ocean-glow glow-two" />

      <header className="topbar">
        <button className="icon-button mobile-only" onClick={() => setMobileChats(true)} aria-label="Чаты">☰</button>
        <div className="brand">
          <div className="brand-mark">D</div>
          <div>
            <div className="brand-name">Denessa</div>
            <div className="brand-sub">Морской мессенджер</div>
          </div>
        </div>
        <div className="top-actions">
          <div className={`status-pill ${connected ? "online" : ""}`}>
            <span className="status-dot" />
            {connected ? "Онлайн" : "Подключение…"}
          </div>
          <button className="profile-button" onClick={() => setMenuOpen((v) => !v)}>{name.slice(0,1).toUpperCase()}</button>
        </div>
        {menuOpen && (
          <div className="profile-menu">
            <div className="profile-title">Ваш профиль</div>
            {editingName ? (
              <div className="name-edit">
                <input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={24} autoFocus />
                <button onClick={saveName}>Сохранить</button>
              </div>
            ) : (
              <>
                <strong>{name}</strong>
                <button onClick={() => setEditingName(true)}>Изменить имя</button>
              </>
            )}
          </div>
        )}
      </header>

      <main className="layout">
        <aside className={`sidebar ${mobileChats ? "mobile-visible" : ""}`}>
          <div className="sidebar-head">
            <div>
              <div className="section-kicker">ВАШИ ЧАТЫ</div>
              <h2>Причал</h2>
            </div>
            <button className="round-button">＋</button>
          </div>

          <div className="search-box">
            <span>⌕</span>
            <input placeholder="Поиск по чатам" />
          </div>

          <div className="chat-list">
            {initialChats.map((chat) => (
              <button key={chat.id} className={`chat-card ${activeChat.id === chat.id ? "active" : ""}`} onClick={() => selectChat(chat)}>
                <div className={`chat-avatar ${chat.color}`}>{chat.icon}</div>
                <div className="chat-copy">
                  <div className="chat-title-row"><strong>{chat.name}</strong><span>{chat.id === activeChat.id ? "сейчас" : ""}</span></div>
                  <div className="chat-subtitle">{chat.subtitle}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="ship-card">
              <span className="ship-icon">⚓</span>
              <div><strong>Denessa 1.1</strong><small>Плывём в онлайн</small></div>
            </div>
          </div>
        </aside>

        <section className="chat-panel">
          <div className="chat-header">
            <button className="icon-button mobile-only" onClick={() => setMobileChats(true)}>‹</button>
            <div className={`chat-avatar large ${activeChat.color}`}>{activeChat.icon}</div>
            <div className="chat-header-copy">
              <h1>{activeChat.name}</h1>
              <span><i className="tiny-dot" /> {online} {online === 1 ? "участник онлайн" : "участника онлайн"}</span>
            </div>
            <div className="chat-actions">
              <button className="icon-button">⌕</button>
              <button className="icon-button">⋯</button>
            </div>
          </div>

          <div className="message-area">
            {messages.length === 0 ? (
              <div className="welcome">
                <div className="anchor">⚓</div>
                <h2>Добро пожаловать в<br /><span>Denessa</span></h2>
                <p>Общайтесь. Создавайте. Плывите дальше.</p>
              </div>
            ) : (
              <>
                <div className="date-chip">Сегодня</div>
                {messages.map((m) => {
                  const mine = m.name === name;
                  return (
                    <div className={`message-row ${mine ? "mine" : ""}`} key={m.id}>
                      {!mine && <div className="mini-avatar">{m.name.slice(0,1).toUpperCase()}</div>}
                      <div className="message-bubble">
                        {!mine && <div className="sender">{m.name}</div>}
                        <div>{m.text}</div>
                        <time>{new Date(m.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div className="composer-wrap">
            <div className="composer">
              <button className="attach-button" aria-label="Вложение">＋</button>
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                placeholder="Напишите сообщение…"
              />
              <button className={`send-button ${text.trim() ? "ready" : ""}`} onClick={sendMessage} aria-label="Отправить">➤</button>
            </div>
            <div className="composer-hint">Сообщения синхронизируются в реальном времени</div>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
