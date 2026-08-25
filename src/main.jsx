import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createRoot } from "react-dom/client";

import "./style.css";

/*
==========================================================
 DENESSA 1.3
 REAL-TIME MESSENGER
==========================================================

 Worker endpoint:

 /ws?room=denessa-lounge&username=...&client=...

 Этот main.jsx автоматически использует тот же домен,
 на котором открыт Denessa.

 HTTPS -> WSS
 HTTP  -> WS
==========================================================
*/


// ========================================================
// НАСТРОЙКИ
// ========================================================

const DEFAULT_ROOM = "denessa-lounge";

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


// ========================================================
// УНИКАЛЬНЫЙ ID УСТРОЙСТВА
// ========================================================

function getClientId() {
  const storageKey = "denessa_client_id";

  let clientId = localStorage.getItem(storageKey);

  if (!clientId) {
    clientId =
      `${Date.now()}-${crypto.randomUUID()}`;

    localStorage.setItem(
      storageKey,
      clientId
    );
  }

  return clientId;
}


// ========================================================
// ИМЯ ПОЛЬЗОВАТЕЛЯ
// ========================================================

function getUsername() {
  const storageKey =
    "denessa_username";

  let username =
    localStorage.getItem(storageKey);

  if (!username) {
    username = "Участник";

    localStorage.setItem(
      storageKey,
      username
    );
  }

  return username;
}


// ========================================================
// WEBSOCKET URL
// ========================================================

function getWebSocketUrl() {
  const protocol =
    window.location.protocol ===
    "https:"
      ? "wss:"
      : "ws:";

  return (
    `${protocol}//${window.location.host}` +
    `/ws?room=${encodeURIComponent(
      DEFAULT_ROOM
    )}` +
    `&username=${encodeURIComponent(
      getUsername()
    )}` +
    `&client=${encodeURIComponent(
      getClientId()
    )}`
  );
}


// ========================================================
// НАЧАЛЬНЫЕ СООБЩЕНИЯ
// ========================================================

const initialMessages = [
  {
    id: "welcome-1",
    author: "Denessa",
    text:
      "Добро пожаловать в Denessa 🌊",
    time: "18:42",
    clientId: "server",
    mine: false,
  },
];


// ========================================================
// AVATAR
// ========================================================

function Avatar({
  chat,
  size = "normal",
}) {
  return (
    <div
      className={`chat-avatar ${chat.theme} avatar-${size}`}
    >
      <span>
        {chat.avatar}
      </span>
    </div>
  );
}


// ========================================================
// ГЛАВНОЕ ПРИЛОЖЕНИЕ
// ========================================================

function Denessa() {

  // ------------------------------------------------------
  // STATE
  // ------------------------------------------------------

  const [activeChat, setActiveChat] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [text, setText] =
    useState("");

  const [messages, setMessages] =
    useState(initialMessages);

  const [online, setOnline] =
    useState(0);

  const [connected, setConnected] =
    useState(false);

  const [username, setUsername] =
    useState(getUsername());

  // ------------------------------------------------------
  // REFS
  // ------------------------------------------------------

  const socketRef =
    useRef(null);

  const reconnectTimerRef =
    useRef(null);

  const reconnectAttemptRef =
    useRef(0);

  const mountedRef =
    useRef(true);

  const clientIdRef =
    useRef(getClientId());

  const bottomRef =
    useRef(null);


  // ======================================================
  // FILTER CHATS
  // ======================================================

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


  // ======================================================
  // CURRENT CHAT
  // ======================================================

  const currentChat =
    chats.find(
      (chat) =>
        chat.id === activeChat
    ) || null;


  // ======================================================
  // SCROLL TO BOTTOM
  // ======================================================

  useEffect(() => {

    if (!activeChat) {
      return;
    }

    requestAnimationFrame(() => {

      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });

    });

  }, [
    messages,
    activeChat,
  ]);


  // ======================================================
  // WEBSOCKET
  // ======================================================

  useEffect(() => {

    mountedRef.current = true;

    connectWebSocket();

    return () => {

      mountedRef.current =
        false;

      if (
        reconnectTimerRef.current
      ) {
        clearTimeout(
          reconnectTimerRef.current
        );
      }

      const socket =
        socketRef.current;

      if (socket) {

        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        try {
          socket.close();
        } catch {}
      }

    };

  }, []);


  // ======================================================
  // CONNECT
  // ======================================================

  function connectWebSocket() {

    if (!mountedRef.current) {
      return;
    }

    // Не создаём второе подключение
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
      getWebSocketUrl();

    console.log(
      "Denessa WebSocket:",
      wsUrl
    );

    let socket;

    try {

      socket =
        new WebSocket(wsUrl);

    } catch (error) {

      console.error(
        "WebSocket creation error:",
        error
      );

      scheduleReconnect();

      return;
    }

    socketRef.current =
      socket;


    // ====================================================
    // OPEN
    // ====================================================

    socket.onopen = () => {

      console.log(
        "Denessa WebSocket connected"
      );

      if (!mountedRef.current) {
        return;
      }

      setConnected(true);

      reconnectAttemptRef.current =
        0;

    };


    // ====================================================
    // MESSAGE
    // ====================================================

    socket.onmessage = (
      event
    ) => {

      if (!mountedRef.current) {
        return;
      }

      try {

        const data =
          JSON.parse(
            event.data
          );

        console.log(
          "Denessa WS:",
          data
        );


        // -----------------------------------------------
        // ИСТОРИЯ
        // -----------------------------------------------

        if (
          data.type ===
          "history"
        ) {

          const serverMessages =
            Array.isArray(
              data.messages
            )
              ? data.messages
              : [];

          setMessages(
            serverMessages.map(
              (message) => ({
                ...message,

                mine:
                  message.clientId ===
                  clientIdRef.current,
              })
            )
          );

          return;
        }


        // -----------------------------------------------
        // НОВОЕ СООБЩЕНИЕ
        // -----------------------------------------------

        if (
          data.type ===
          "message"
        ) {

          const message =
            data.message;

          if (!message) {
            return;
          }

          setMessages(
            (oldMessages) => {

              // Защита от дублей
              const alreadyExists =
                oldMessages.some(
                  (item) =>
                    item.id ===
                    message.id
                );

              if (
                alreadyExists
              ) {
                return oldMessages;
              }

              return [
                ...oldMessages,

                {
                  ...message,

                  mine:
                    message.clientId ===
                    clientIdRef.current,
                },
              ];
            }
          );

          return;
        }


        // -----------------------------------------------
        // ONLINE
        // -----------------------------------------------

        if (
          data.type ===
          "presence"
        ) {

          const count =
            Number(
              data.online
            );

          setOnline(
            Number.isFinite(count)
              ? count
              : 0
          );

          return;
        }


        // -----------------------------------------------
        // ERROR
        // -----------------------------------------------

        if (
          data.type ===
          "error"
        ) {

          console.error(
            "Denessa server:",
            data.message
          );

          return;
        }

      } catch (error) {

        console.error(
          "Denessa WebSocket message parse error:",
          error
        );

      }

    };


    // ====================================================
    // ERROR
    // ====================================================

    socket.onerror = (
      error
    ) => {

      console.error(
        "Denessa WebSocket error:",
        error
      );

      if (
        mountedRef.current
      ) {
        setConnected(false);
      }

    };


    // ====================================================
    // CLOSE
    // ====================================================

    socket.onclose = (
      event
    ) => {

      console.log(
        "Denessa WebSocket closed:",
        event.code,
        event.reason
      );

      if (
        !mountedRef.current
      ) {
        return;
      }

      setConnected(false);

      socketRef.current =
        null;

      scheduleReconnect();

    };

  }


  // ======================================================
  // RECONNECT
  // ======================================================

  function scheduleReconnect() {

    if (
      !mountedRef.current
    ) {
      return;
    }

    if (
      reconnectTimerRef.current
    ) {
      return;
    }

    const attempt =
      reconnectAttemptRef.current;

    const delay =
      Math.min(
        1000 *
          Math.pow(
            2,
            attempt
          ),
        10000
      );

    reconnectAttemptRef.current =
      attempt + 1;

    console.log(
      `Denessa reconnect in ${delay}ms`
    );

    reconnectTimerRef.current =
      setTimeout(() => {

        reconnectTimerRef.current =
          null;

        connectWebSocket();

      }, delay);

  }


  // ======================================================
  // SEND MESSAGE
  // ======================================================

  function sendMessage() {

    const value =
      text.trim();

    if (!value) {
      return;
    }

    const socket =
      socketRef.current;


    // ----------------------------------------------------
    // Если WebSocket ещё не подключён
    // ----------------------------------------------------

    if (
      !socket ||
      socket.readyState !==
        WebSocket.OPEN
    ) {

      console.warn(
        "Denessa: WebSocket not connected"
      );

      // Попробуем переподключиться
      connectWebSocket();

      return;
    }


    const now =
      new Date();


    const message = {

      type: "message",

      id:
        `${Date.now()}-${crypto.randomUUID()}`,

      clientId:
        clientIdRef.current,

      author:
        username,

      text:
        value,

      time:
        now.toLocaleTimeString(
          "ru-RU",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        ),

    };


    try {

      socket.send(
        JSON.stringify(
          message
        )
      );

      setText("");

    } catch (error) {

      console.error(
        "Denessa send error:",
        error
      );

    }

  }


  // ======================================================
  // KEYBOARD
  // ======================================================

  function handleKeyDown(
    event
  ) {

    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }


  // ======================================================
  // CHANGE USERNAME
  // ======================================================

  function changeUsername() {

    const value =
      window.prompt(
        "Введите ваше имя:",
        username
      );

    if (
      value === null
    ) {
      return;
    }

    const newName =
      value.trim();

    if (!newName) {
      return;
    }

    localStorage.setItem(
      "denessa_username",
      newName
    );

    setUsername(
      newName
    );


    // Переподключаем WebSocket
    // чтобы сервер получил новое имя

    const socket =
      socketRef.current;

    if (socket) {

      try {
        socket.close();
      } catch {}

    }

  }


  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="denessa-shell">


      {/* =================================================
          HEADER
      ================================================= */}

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


        <button
          className="header-online"
          onClick={changeUsername}
          title={`Вы: ${username}`}
        >

          <span
            className={`online-pulse ${
              connected
                ? ""
                : "offline"
            }`}
          ></span>

          <span>
            {connected
              ? online > 0
                ? `Онлайн ${online}`
                : "Онлайн"
              : "Подключение..."}
          </span>

        </button>


        <button
          className="profile-avatar"
          onClick={
            changeUsername
          }
        >
          {username
            .charAt(0)
            .toUpperCase()}
        </button>

      </header>


      {/* =================================================
          HOME
      ================================================= */}

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


            <button
              className="new-chat-button"
            >
              +
            </button>

          </section>


          {/* SEARCH */}

          <div className="search-box">

            <span className="search-icon">
              ⌕
            </span>

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Поиск по чатам"
            />

          </div>


          {/* CHAT LIST */}

          <section className="chat-list">

            {filteredChats.map(
              (
                chat,
                index
              ) => (

                <button
                  key={
                    chat.id
                  }
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
                        {chat.id ===
                        "lounge"
                          ? online > 0
                            ? `${online} участник${
                                online === 1
                                  ? ""
                                  : "а"
                              } онлайн`
                            : chat.preview
                          : chat.preview}
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


          {/* VERSION */}

          <div className="version-card">

            <div className="version-avatar">
              ⚓
            </div>


            <div>

              <strong>
                Denessa 1.3
              </strong>

              <span>
                {connected
                  ? "Плывём онлайн"
                  : "Подключение к океану..."}
              </span>

            </div>


            <span className="version-arrow">
              ›
            </span>

          </div>

        </main>

      )}


      {/* =================================================
          CHAT
      ================================================= */}

      {currentChat && (

        <main className="chat-screen">


          {/* CONVERSATION HEADER */}

          <header className="conversation-header">


            <button
              className="back-button"
              onClick={() =>
                setActiveChat(
                  null
                )
              }
            >
              ‹
            </button>


            <Avatar
              chat={
                currentChat
              }
              size="small"
            />


            <div className="conversation-info">

              <strong>
                {currentChat.name}
              </strong>


              <span>

                <i className="tiny-online"></i>

                {currentChat.id ===
                "lounge"
                  ? online > 0
                    ? `${online} участник${
                        online === 1
                          ? ""
                          : "а"
                      } онлайн`
                    : "Подключение..."
                  : currentChat.online
                    ? "1 участник онлайн"
                    : "Канал"}

              </span>

            </div>


            <button
              className="conversation-action"
            >
              ⋯
            </button>

          </header>


          {/* MESSAGES */}

          <section className="messages">


            <div className="date-divider">

              <span>
                Сегодня
              </span>

            </div>


            {/* WELCOME */}

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


            {/* MESSAGE LIST */}

            {messages.map(
              (
                message
              ) => (

                <div
                  key={
                    message.id
                  }
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


          {/* COMPOSER */}

          <footer className="composer">


            <button className="add-button">
              +
            </button>


            <textarea
              value={text}
              onChange={(
                event
              ) =>
                setText(
                  event.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Напишите сообщение..."
              rows={1}
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


      {/* =================================================
          BOTTOM NAV
      ================================================= */}

      {!currentChat && (

        <nav className="bottom-nav">


          <button
            className="bottom-nav-item active"
          >
            <span>
              ◉
            </span>

            <small>
              Чаты
            </small>

          </button>


          <button
            className="bottom-nav-item"
          >
            <span>
              ♙
            </span>

            <small>
              Контакты
            </small>

          </button>


          <button
            className="bottom-nav-item"
          >
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


// ========================================================
// ERROR BOUNDARY
// ========================================================

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


  componentDidCatch(
    error
  ) {

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


// ========================================================
// START
// ========================================================

const rootElement =
  document.getElementById(
    "root"
  );


if (!rootElement) {

  throw new Error(
    "Denessa: элемент #root не найден"
  );

}


createRoot(
  rootElement
).render(

  <DenessaErrorBoundary>

    <Denessa />

  </DenessaErrorBoundary>

);
