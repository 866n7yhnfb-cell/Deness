import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || window.location.origin;
const WS = API.replace(/^http/, 'ws') + '/ws';

async function api(path, options = {}) {
  const token = localStorage.getItem('denessa_token');
  const headers = { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(options.headers||{}) };
  const r = await fetch(`${API}${path}`, {...options, headers});
  const text = await r.text(); let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {error:text||'Ошибка сервера'}; }
  if (!r.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

function Auth({onLogin}) {
  const [register,setRegister]=useState(false),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{const data=await api(register?'/api/auth/register':'/api/auth/login',{method:'POST',body:JSON.stringify(register?{username,password,displayName:name}:{username,password})});localStorage.setItem('denessa_token',data.token);onLogin(data.user)}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <div className="auth"><div className="orb orb1"/><div className="orb orb2"/><div className="authCard"><div className="logo"><span className="logoMark">◒</span> Denessa</div><p className="tag">Твой океан общения.</p><form onSubmit={submit}>{register&&<input required placeholder="Ваше имя" value={name} onChange={e=>setName(e.target.value)}/>}<input required minLength={3} placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)}/><input required minLength={6} type="password" placeholder="Пароль (минимум 6 символов)" value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<div className="error">{error}</div>}<button disabled={busy}>{busy?'Подождите…':register?'Создать аккаунт':'Войти'}</button></form><button className="link" onClick={()=>{setRegister(v=>!v);setError('')}}>{register?'Уже есть аккаунт':'Создать новый аккаунт'}</button></div></div>
}

function App({user,onLogout}) {
  const [users,setUsers]=useState([]),[servers,setServers]=useState([]),[activeChannel,setActiveChannel]=useState(null),[dm,setDm]=useState(null),[messages,setMessages]=useState([]),[text,setText]=useState(''),[search,setSearch]=useState(''),[loading,setLoading]=useState(true),[online,setOnline]=useState(false);
  const wsRef=useRef(null),bottomRef=useRef(null);
  const currentServer=servers[0]||null;
  const title=dm?dm.displayName:(activeChannel?.name||'Выберите канал');
  const filteredUsers=useMemo(()=>users.filter(u=>`${u.displayName} ${u.username}`.toLowerCase().includes(search.toLowerCase())),[users,search]);

  useEffect(()=>{Promise.all([api('/api/users'),api('/api/servers')]).then(([u,s])=>{setUsers(u.users);setServers(s.servers);if(s.servers?.[0]?.channels?.[0])setActiveChannel(s.servers[0].channels[0])}).catch(e=>console.error(e)).finally(()=>setLoading(false))},[]);

  useEffect(()=>{
    let ws;
    try { ws=new WebSocket(`${WS}?token=${encodeURIComponent(localStorage.getItem('denessa_token')||'')}`); wsRef.current=ws; ws.onopen=()=>setOnline(true); ws.onclose=()=>setOnline(false); ws.onerror=()=>setOnline(false); ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='message'){const sc=m.scope;const match=dm?sc?.kind==='dm'&&((Number(sc.a)===Number(user.id)&&Number(sc.b)===Number(dm.id))||(Number(sc.b)===Number(user.id)&&Number(sc.a)===Number(dm.id))):activeChannel&&sc?.kind==='channel'&&Number(sc.id)===Number(activeChannel.id);if(match)setMessages(v=>v.some(x=>x.id===m.message.id)?v:[...v,m.message]);}}catch{}} } catch{}
    return()=>{try{ws?.close()}catch{}};
  },[]);

  useEffect(()=>{let cancelled=false;(async()=>{try{if(dm)setMessages((await api(`/api/dm/${dm.id}/messages`)).messages);else if(activeChannel)setMessages((await api(`/api/channels/${activeChannel.id}/messages`)).messages);else setMessages([])}catch(e){if(!cancelled)console.error(e)}})();return()=>{cancelled=true}},[activeChannel?.id,dm?.id]);
  useEffect(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),[messages.length]);
  function selectDm(t){setDm(t);setActiveChannel(null)}
  function selectChannel(c){setDm(null);setActiveChannel(c)}
  function send(){const body=text.trim();if(!body||!wsRef.current||wsRef.current.readyState!==1)return;wsRef.current.send(JSON.stringify(dm?{action:'send-dm',recipientId:dm.id,body}:{action:'send-channel-message',channelId:activeChannel?.id,body}));setText('')}
  async function createServer(){const name=prompt('Название сервера','Denessa Ocean');if(!name?.trim())return;try{const d=await api('/api/servers',{method:'POST',body:JSON.stringify({name})});setServers(v=>[...v,d.server]);selectChannel(d.server.channels[0])}catch(e){alert(e.message)}}

  return <div className="app"><aside className="rail"><div className="brand">◒</div>{servers.map(s=><button className="server" key={s.id} title={s.name} onClick={()=>selectChannel(s.channels[0])}>{s.name.slice(0,2).toUpperCase()}</button>)}<button className="server add" onClick={createServer}>＋</button></aside><aside className="sidebar"><div className="sideTop"><div><b>Denessa</b><small>Ocean workspace</small></div><button title="Выйти" onClick={onLogout}>↪</button></div><div className="profile"><div className="bigAvatar">{user.displayName[0]}</div><div><b>{user.displayName}</b><small>@{user.username}</small></div><span className={online?'onlineDot':'offlineDot'}/></div><div className="search">⌕ <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск людей…"/></div><div className="section"><span>ЛИЧНЫЕ СООБЩЕНИЯ</span></div>{loading?<div className="empty">Загрузка…</div>:filteredUsers.length===0?<div className="empty">Пользователи не найдены</div>:filteredUsers.map(u=><button className={`userRow ${dm?.id===u.id?'sel':''}`} onClick={()=>selectDm(u)} key={u.id}><i>{u.displayName[0]}</i><span>{u.displayName}<small>@{u.username}</small></span></button>)}<div className="section"><span>КАНАЛЫ</span></div>{currentServer?.channels?.map(c=><button className={`channel ${activeChannel?.id===c.id&&!dm?'sel':''}`} onClick={()=>selectChannel(c)} key={c.id}># {c.name}</button>)}</aside><main className="chat"><header><div><b>{title}</b><small>{dm?`@${dm.username}`:currentServer?.name||'Denessa'}</small></div><div className="headerActions">{online?'● Онлайн':'○ Офлайн'}　⋯</div></header><div className="messages">{messages.length===0&&<div className="welcome"><div className="welcomeIcon">◒</div><h2>{title}</h2><p>Начните разговор. Море сообщений ждёт вас.</p></div>}{messages.map((m,i)=><div className={`msg ${Number(m.sender_id)===Number(user.id)?'mine':''}`} key={m.id||i}><div className="avatar">{m.display_name?.[0]||'?'}</div><div><div className="meta"><b>{Number(m.sender_id)===Number(user.id)?'Вы':m.display_name}</b><small>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></div><div className="bubble">{m.body}</div></div></div>)}<div ref={bottomRef}/></div><div className="composer"><button>＋</button><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Написать сообщение…"/><button className="send" onClick={send}>➤</button></div></main></div>
}

function Root(){const[user,setUser]=useState(null),[checking,setChecking]=useState(true);useEffect(()=>{const t=localStorage.getItem('denessa_token');if(!t){setChecking(false);return}api('/api/me').then(d=>setUser(d.user)).catch(()=>localStorage.removeItem('denessa_token')).finally(()=>setChecking(false))},[]);if(checking)return <div className="splash">◒<span>Denessa</span></div>;if(!user)return <Auth onLogin={setUser}/>;return <App user={user} onLogout={()=>{localStorage.removeItem('denessa_token');location.reload()}}/>}
createRoot(document.getElementById('root')).render(<Root/>);
