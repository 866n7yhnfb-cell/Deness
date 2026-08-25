import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createRoot } from "react-dom/client";
import "./style.css";


// ======================================================
// DENESSA CONFIG
// ======================================================

const WORKER_URL =
  "https://denessa-messenger.fdhtvsn8yh.workers.dev";

const ROOM = "denessa-lounge";


// ======================================================
// CHATS
// ======================================================

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


// ======================================================
// AVATAR
// ======================================================

function Avatar({
  chat,
  size = "normal",
}) {
  return (
    <div
      className={`chat-avatar ${chat.theme} avatar-${size}`}
    >
      <span>{chat.avatar}</span>
    </div>
  );
}


// ======================================================
// CLIENT ID
// ======================================================

function getClientId() {
  let id =
    localStorage.getItem(
      "denessa_client_id"
    );

  if (!id) {
    id =
      crypto.randomUUID();

    localStorage.setItem(
      "denessa_client_id",
      id
    );
  }

  return id;
}


// ======================================================
// USERNAME
// ======================================================

function getUsername() {
  let username =
    localStorage.getItem(
      "denessa_username"
    );

  if (!username) {
    username = "Участник";

    localStorage.setItem(
      "denessa_username",
      username
    );
  }

  return username;
}


// ======================================================
// WEBSOCKET URL
// ======================================================

function createWebSocketUrl() {
  const url =
    new URL(
      "/ws",
      WORKER_URL
    );

  url.searchParams.set(
    "room",
    ROOM
  );

  url.searchParams.set(
    "username",
    getUsername()
  );

  url.searchParams.set(
    "client",
    getClientId()
  );

  url.protocol =
    url.protocol === "https:"
      ? "wss:"
      : "ws:";

  return url.toString();
}


// ======================================================
// MAIN APP
// ======================================================

function Denessa() {

  const [activeChat, setActiveChat] =
    useState("lounge");

  const [search, setSearch] =
    useState("");

  const [text, setText] =
    useState("");

  const [messages, setMessages] =
    useState([]);

  const [online, setOnline] =
    useState(0);

  const [connected, setConnected] =
    useState(false);

  const socketRef =
    useRef(null);

  const reconnectTimer =
    useRef(null);

  const bottomRef =
    useRef(null);


  // ====================================================
  // FILTER CHATS
  // ====================================================

  const filteredChats =
    useMemo(() => {

      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return chats;
      }

      return chats.filter(
        (chat) =>
          chat.name
            .toLowerCase()
            .includes(value) ||

          chat.subtitle
            .toLowerCase()
            .includes(value) ||

          chat.preview
            .toLowerCase()
            .includes(value)
      );

    }, [search]);


  // ====================================================
  // CURRENT CHAT
  // ====================================================

  const currentChat =
    chats.find(
      (chat) =>
        chat.id === activeChat
    ) || chats[0];


  // ====================================================
  // CONNECT WEBSOCKET
  // ====================================================

  const connectWebSocket =
    () => {

      // Не создаём несколько соединений

      if (
        socketRef.current &&
        (
          socketRef.current.readyState ===
            WebSocket.OPEN ||

          socketRef.current.readyState ===
            WebSocket.CONNECTING
        )
      ) {
        return;
      }


      const wsUrl =
        createWebSocketUrl();

      console.log(
        "Denessa connecting:",
        wsUrl
      );


      const socket =
        new WebSocket(
          wsUrl
        );


      socketRef.current =
        socket;


      // ==================================================
      // OPEN
      // ==================================================

      socket.onopen =
        () => {

          console.log(
            "Denessa WebSocket connected"
          );

          setConnected(true);

        };


      // ==================================================
      // MESSAGE
      // ==================================================

      socket.onmessage =
        (event) => {

          try {

            const data =
              JSON.parse(
                event.data
              );


            console.log(
              "Denessa received:",
              data
            );


            // ------------------------------------------
            // HISTORY
            // ------------------------------------------

            if (
              data.type ===
              "history"
            ) {

              const history =
                Array.isArray(
                  data.messages
                )
                  ? data.messages
                  : [];


              const clientId =
                getClientId();


              setMessages(
                history.map(
                  (message) => ({
                    ...message,

                    mine:
                      message.clientId ===
                      clientId,
                  })
                )
              );


              return;
            }


            // ------------------------------------------
            // NEW MESSAGE
            // ------------------------------------------

            if (
              data.type ===
              "message"
            ) {

              const message =
                data.message;


              if (!message) {
                return;
              }


              const clientId =
                getClientId();


              setMessages(
                (old) => {

                  // Не добавляем дубликат

                  if (
                    old.some(
                      (item) =>
                        item.id ===
                        message.id
                    )
                  ) {
                    return old;
                  }


                  return [
                    ...old,

                    {
                      ...message,

                      mine:
                        message.clientId ===
                        clientId,
                    },
                  ];
                }
              );


              return;
            }


            // ------------------------------------------
            // ONLINE
            // ------------------------------------------

            if (
              data.type ===
              "presence"
            ) {

              const count =
                Number(
                  data.online
                ) || 0;


              console.log(
                "Denessa online:",
                count
              );


              setOnline(
                count
              );


              return;
            }


            // ------------------------------------------
            // ERROR
            // ------------------------------------------

            if (
              data.type ===
              "error"
            ) {

              console.error(
                "Denessa server error:",
                data.message
              );

            }

          } catch (
            error
          ) {

            console.error(
              "Denessa message parse error:",
              error
            );

          }
        };


      // ==================================================
      // CLOSE
      // ==================================================

      socket.onclose =
        () => {

          console.log(
            "Denessa WebSocket disconnected"
          );

          setConnected(false);

          setOnline(0);


          socketRef.current =
            null;


          // Автоматическое переподключение

          clearTimeout(
            reconnectTimer.current
          );


          reconnectTimer.current =
            setTimeout(
              () => {
                connectWebSocket();
              },
              2000
            );

        };


      // ==================================================
      // ERROR
      // ==================================================

      socket.onerror =
        (error) => {

          console.error(
            "Denessa WebSocket error:",
            error
          );

        };
    };


  // ====================================================
  // CONNECT ON START
  // ====================================================

  useEffect(() => {

    connectWebSocket();


    return () => {

      clearTimeout(
        reconnectTimer.current
      );


      if (
        socketRef.current
      ) {

        socketRef.current.close();

        socketRef.current =
          null;
      }

    };

  }, []);


  // ====================================================
  // SCROLL
  // ====================================================

  useEffect(() => {

    setTimeout(() => {

      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });

    }, 50);

  }, [messages]);


  // ====================================================
  // SEND MESSAGE
  // ====================================================

  const sendMessage =
    () => {

      const value =
        text.trim();


      if (!value) {
        return;
      }


      const socket =
        socketRef.current;


      if (
        !socket ||
        socket.readyState !==
          WebSocket.OPEN
      ) {

        console.warn(
          "Denessa: WebSocket not connected"
        );

        return;
      }


      const message = {

        type:
          "message",

        id:
          `${Date.now()}-${crypto.randomUUID()}`,

        clientId:
          getClientId(),

        author:
          getUsername(),

        text:
          value,

        time:
          new Date().toLocaleTimeString(
            "ru-RU",
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
      };


      console.log(
        "Denessa sending:",
        message
      );


      socket.send(
        JSON.stringify(
          message
        )
      );


      setText("");
    };


  // ====================================================
  // ENTER
  // ====================================================

  const handleKeyDown =
    (event) => {

      if (
        event.key ===
          "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();
      }

    };


  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="denessa-shell">

      {/* ============================================
          HEADER
      ============================================ */}

      <header className="app-header">

        <button
          className="header-icon"
          aria-label="Меню"
        >
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


        {/* ==========================================
            ONLINE
        ========================================== */}

        <div
          className={`header-online ${
            connected
              ? "is-connected"
              : "is-disconnected"
          }`}
        >

          <span className="online-pulse"></span>


          <span>

            {connected
              ? `Онлайн ${online}`
              : "Подключение..."}

          </span>

        </div>


        <button className="profile-avatar">
          J
        </button>

      </header>


      {/* ============================================
          HOME
      ============================================ */}

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
                setSearch(
                  event.target.value
                )
              }
              placeholder="Поиск по чатам"
            />

          </div>


          <section className="chat-list">

            {filteredChats.map(
              (chat, index) => (

                <button
                  key={chat.id}
                  className={`chat-card ${
                    index === 0
                      ? "chat-card-active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveChat(
                      chat.id
                    )
                  }
                >

                  <Avatar
                    chat={chat}
                  />


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

              )
            )}

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


      {/* ============================================
          CHAT
      ============================================ */}

      {currentChat && (

        <main className="chat-screen">

          {/* ==========================================
              CONVERSATION HEADER
          ========================================== */}

          <header className="conversation-header">

            <button
              className="back-button"
              onClick={() =>
                setActiveChat(null)
              }
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

                {connected
                  ? `${online} участник${
                      online === 1
                        ? ""
                        : "а"
                    } онлайн`
                  : "Подключение..."}

              </span>

            </div>


            <button className="conversation-action">
              ⋯
            </button>

          </header>


          {/* ==========================================
              MESSAGES
          ========================================== */}

          <section className="messages">

            <div className="date-divider">
              <span>
                Сегодня
              </span>
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


            {messages.map(
              (message) => (

                <div
                  key={message.id}
                  className={`message-line ${
                    message.mine
                      ? "message-line-mine"
                      : ""
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
                        <b>
                          ✓✓
                        </b>
                      )}

                    </small>

                  </div>

                </div>

              )
            )}


            <div
              ref={bottomRef}
            />

          </section>


          {/* ==========================================
              COMPOSER
          ========================================== */}

          <footer className="composer">

            <button className="add-button">
              +
            </button>


            <textarea
              value={text}
              onChange={(event) =>
                setText(
                  event.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder={
                connected
                  ? "Напишите сообщение..."
                  : "Подключение..."
              }
              rows={1}
              disabled={!connected}
            />


            <button
              className="send-button"
              disabled={
                !text.trim() ||
                !connected
              }
              onClick={
                sendMessage
              }
            >
              ➤
            </button>

          </footer>

        </main>
      )}


      {/* ============================================
          BOTTOM NAV
      ============================================ */}

      {!currentChat && (

        <nav className="bottom-nav">

          <button className="bottom-nav-item active">

            <span>
              ◉
            </span>

            <small>
              Чаты
            </small>

          </button>


          <button className="bottom-nav-item">

            <span>
              ♙
            </span>

            <small>
              Контакты
            </small>

          </button>


          <button className="bottom-nav-item">

            <span>
              ⚙
            </span>

            <small>
              Настройки
            </small>

          </button>

        </nav>
      )}

    </div>
  );
}


// ======================================================
// ERROR BOUNDARY
// ======================================================

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
      "Denessa error:",
      error
    );
  }


  render() {

    if (
      this.state.hasError
    ) {

      return (
        <div className="error-screen">

          <div className="error-anchor">
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


// ======================================================
// START
// ======================================================

createRoot(
  document.getElementById("root")
).render(

  <DenessaErrorBoundary>

    <Denessa />

  </DenessaErrorBoundary>
  
);
