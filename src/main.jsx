import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../style.css";

function Denessa() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  function sendMessage() {
    const text = message.trim();

    if (!text) return;

    setMessages((old) => [
      ...old,
      {
        id: Date.now(),
        text,
      },
    ]);

    setMessage("");
  }

  return (
    <div className="denessa">
      <header className="topbar">
        <div className="logo">D</div>

        <div>
          <div className="brand">Denessa</div>
          <div className="status">Морской мессенджер</div>
        </div>

        <div className="online">
          ● Онлайн
        </div>
      </header>

      <main className="chat">
        <div className="welcome">
          <div className="ship">⚓</div>
          <h1>Добро пожаловать в Denessa</h1>
          <p>Общайся. Создавай. Плыви дальше.</p>
        </div>

        <div className="messages">
          {messages.map((item) => (
            <div className="message" key={item.id}>
              {item.text}
            </div>
          ))}
        </div>
      </main>

      <div className="composer">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Напиши сообщение..."
        />

        <button onClick={sendMessage}>
          ➤
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <Denessa />
);
