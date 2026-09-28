(() => {
"use strict";
const cfg=window.APP_CONFIG||{};
const configured=cfg.supabaseUrl&&!cfg.supabaseUrl.includes("YOUR_PROJECT")&&cfg.supabaseAnonKey&&!cfg.supabaseAnonKey.includes("YOUR_");
const sb=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={tab:"home",meetings:[],notices:[],schedules:[],project:"전체",trash:false,q:"",todoFilter:"open",
  calendarMonth:new Date(new Date().getFullYear(),new Date().getMonth(),1),
  selectedDate:null};
const KEYS={meetings:"group-meetings-v2",notices:"group-notices-v2",schedules:"group-schedules-v2",author:"group-author-v2"};

function now(){return new Date().toISOString()}
function today(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function fmtDate(s){if(!s)return"";const[y,m,d]=s.slice(0,10).split("-");return`${y}.${m}.${d}`}
function fmtDT(s){if(!s)return"";return new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(s))}
function monthDay(s){const d=new Date(s+"T00:00:00");return{m:`${d.getMonth()+1}월`,d:d.getDate(),w:new Intl.DateTimeFormat("ko-KR",{weekday:"short"}).format(d)}}
function getAuthor(){return localStorage.getItem(KEYS.author)||""}
function localGet(key,fallback=[]){try{const x=JSON.parse(localStorage.getItem(key)||"null");return Array.isArray(x)?x:fallback}catch{return fallback}}
function localSet(key,data){localStorage.setItem(key,JSON.stringify(data))}
function seed(){
 if(!localStorage.getItem(KEYS.meetings)) localSet(KEYS.meetings,[{id:crypto.randomUUID(),project:"운영회의",title:"샘플 정기모임",meeting_date:today(),start_time:"19:00",location:"온라인",attendees:"김OO, 이OO, 박OO",summary:"이번 달 일정과 준비사항을 확인했습니다.",discussion:"다음 모임 일정과 역할을 논의했습니다.",decisions:"다음 모임은 둘째 주 토요일로 정했습니다.",actions:[{task:"장소 후보 확인",owner:"김OO",due:today(),done:false},{task:"공지문 작성",owner:"이OO",due:today(),done:true}],links:"",author:"샘플",created_at:now(),updated_at:now(),deleted_at:null,_history:[]}]);
 if(!localStorage.getItem(KEYS.notices)) localSet(KEYS.notices,[{id:crypto.randomUUID(),title:"모임 운영 페이지가 열렸습니다",body:"공지, 일정, 회의록, 할 일을 한 곳에서 관리합니다.",pinned:true,author:"샘플",created_at:now(),updated_at:now()}]);
 if(!localStorage.getItem(KEYS.schedules)){const d=new Date();d.setDate(d.getDate()+7);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());localSet(KEYS.schedules,[{id:crypto.randomUUID(),title:"다음 정기모임",event_date:d.toISOString().slice(0,10),event_time:"19:00",location:"미정",note:"세부 장소는 추후 공지",author:"샘플",created_at:now(),updated_at:now()}])}
}
function banner(msg){const e=$("#modeBanner");e.textContent=msg;e.classList.remove("hidden")}
function authorPrompt(){
 if(getAuthor()) return Promise.resolve(getAuthor());
 return new Promise(resolve=>{const d=$("#nameDialog"),f=$("#nameForm");$("#authorInput").value="";f._resolve=resolve;d.showModal()})
}

async function loadAll(){
 try{
  if(configured){
   const [m,n,s]=await Promise.all([
    sb.from("meetings").select("*").order("meeting_date",{ascending:false}).order("created_at",{ascending:false}),
    sb.from("announcements").select("*").order("pinned",{ascending:false}).order("created_at",{ascending:false}),
    sb.from("schedules").select("*").order("event_date",{ascending:true}).order("event_time",{ascending:true})
   ]);
   if(m.error)throw m.error;if(n.error)throw n.error;if(s.error)throw s.error;
   state.meetings=m.data||[];state.notices=n.data||[];state.schedules=s.data||[];
  }else{
   seed();state.meetings=localGet(KEYS.meetings);state.notices=localGet(KEYS.notices);state.schedules=localGet(KEYS.schedules)
  }
  renderAll();
 }catch(e){console.error(e);alert("데이터를 불러오지 못했습니다. Supabase 설정을 확인하세요.")}
}
function renderAll(){renderHome();renderMeetings();renderNotices();renderSchedules();renderTodos();renderCalendar();}

function setTab(tab){
 state.tab=tab;
 if(tab==="calendar") renderCalendar();
 $$(".view").forEach(v=>v.classList.add("hidden"));
 $(`#${tab}View`)?.classList.remove("hidden");
 $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.nav===tab));
 $$(".desktop-tab").forEach(b=>b.classList.toggle("active",b.dataset.nav===tab));
 $("#fab").classList.toggle("hidden",tab!=="meetings");
 window.scrollTo({top:0,behavior:"smooth"});
}

function upcomingSchedules(){const t=today();return state.schedules.filter(x=>x.event_date>=t).sort((a,b)=>(a.event_date+(a.event_time||"")).localeCompare(b.event_date+(b.event_time||"")))}

function renderHome(){
 const next=upcomingSchedules()[0];
 $("#nextMeetingTitle").textContent=next?next.title:"다음 모임을 등록해보세요";
 $("#nextMeetingMeta").textContent=next?`${fmtDate(next.event_date)}${next.event_time?" · "+next.event_time.slice(0,5):""}${next.location?" · "+next.location:""}`:"일정이 등록되면 여기에 가장 가까운 모임이 표시됩니다.";

 const notices=state.notices.slice().sort((a,b)=>(Number(b.pinned)-Number(a.pinned))||String(b.created_at).localeCompare(String(a.created_at))).slice(0,4);
 $("#noticeHomeList").innerHTML=notices.length?notices.map(n=>`<div class="compact-item" data-notice-id="${n.id}"><div class="compact-icon">${n.pinned?"📌":"●"}</div><div class="compact-main"><div class="compact-title">${esc(n.title)}</div><div class="compact-sub">${esc(n.body||"내용 없음")}</div></div></div>`).join(""):`<p class="muted">등록된 공지가 없습니다.</p>`;

 const ms=state.meetings.filter(m=>!m.deleted_at).slice().sort((a,b)=>String(b.meeting_date).localeCompare(String(a.meeting_date))).slice(0,4);
 $("#recentMeetingList").innerHTML=ms.length?ms.map(m=>`<div class="compact-item" data-meeting-id="${m.id}"><div class="compact-icon">📝</div><div class="compact-main"><div class="compact-title">${esc(m.title)}</div><div class="compact-sub">${fmtDate(m.meeting_date)} · ${esc(m.project)}</div></div></div>`).join(""):`<p class="muted">회의록이 없습니다.</p>`;

 const todos=allTodos(false).slice(0,5);
 $("#todoCountBadge").textContent=allTodos(false).length;
 $("#todoHomeList").innerHTML=todos.length?todos.map(t=>`<div class="compact-item" data-todo-meeting="${t.meetingId}"><div class="compact-icon">✓</div><div class="compact-main"><div class="compact-title">${esc(t.task)}</div><div class="compact-sub">${esc(t.owner||"담당 미정")}${t.due?" · "+fmtDate(t.due):""}</div></div></div>`).join(""):`<p class="muted">남은 할 일이 없습니다.</p>`;

 const ss=upcomingSchedules().slice(0,4);
 $("#scheduleHomeList").innerHTML=ss.length?ss.map(s=>`<div class="compact-item" data-schedule-id="${s.id}"><div class="compact-icon">◷</div><div class="compact-main"><div class="compact-title">${esc(s.title)}</div><div class="compact-sub">${fmtDate(s.event_date)}${s.event_time?" · "+s.event_time.slice(0,5):""}</div></div></div>`).join(""):`<p class="muted">예정 일정이 없습니다.</p>`;
}

function filteredMeetings(){
 const q=state.q.trim().toLowerCase();
 return state.meetings.filter(m=>{
  if(Boolean(m.deleted_at)!==state.trash)return false;
  if(state.project!=="전체"&&m.project!==state.project)return false;
  if(!q)return true;
  return [m.title,m.project,m.attendees,m.summary,m.discussion,m.decisions,m.location,...(m.actions||[]).flatMap(a=>[a.task,a.owner])].join(" ").toLowerCase().includes(q)
 })
}
function renderMeetings(){
 const projects=[...new Set(state.meetings.filter(m=>!m.deleted_at).map(m=>m.project).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ko"));
 if(state.project!=="전체"&&!projects.includes(state.project))state.project="전체";
 $("#projectChips").innerHTML=["전체",...projects].map(p=>`<button class="chip ${state.project===p?"active":""}" data-project="${esc(p)}">${esc(p)}</button>`).join("");
 $("#projectList").innerHTML=projects.map(p=>`<option value="${esc(p)}"></option>`).join("");
 const rows=filteredMeetings();$("#meetingCountMeta").textContent=`${rows.length}건`;$("#trashToggleBtn").textContent=state.trash?"회의록으로 돌아가기":"휴지통 보기";
 $("#meetingList").innerHTML=rows.map(meetingCard).join("");
 $("#meetingEmpty").classList.toggle("hidden",rows.length!==0||state.trash);
 if(state.trash&&!rows.length)$("#meetingList").innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-icon">♲</div><h3>휴지통이 비어 있습니다</h3></div>`;
}
function meetingCard(m){
 const a=m.actions||[],done=a.filter(x=>x.done).length,pct=a.length?Math.round(done/a.length*100):0,c=(m.attendees||"").split(",").map(x=>x.trim()).filter(Boolean).length;
 return `<article class="meeting-card" data-meeting-id="${m.id}">
  <div class="card-top"><span class="badge">${esc(m.project||"기타")}</span><span class="date">${fmtDate(m.meeting_date)}${m.start_time?" · "+m.start_time.slice(0,5):""}</span></div>
  <div style="display:flex;gap:8px;align-items:flex-start"><h3>${esc(m.title)}</h3><button class="quick-edit" data-quick-edit="${m.id}">제목 수정</button></div>
  <div class="card-summary">${esc(m.summary||m.decisions||m.discussion||"내용을 열어 확인하세요.")}</div>
  ${a.length?`<div class="progress"><span style="width:${pct}%"></span></div>`:""}
  <div class="card-meta">${m.location?`<span>⌖ ${esc(m.location)}</span>`:""}${c?`<span>☺ ${c}명</span>`:""}${a.length?`<span>✓ ${done}/${a.length}</span>`:""}</div>
 </article>`
}

function isoLocalDate(d){
 const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)
}
function calendarEventsFor(dateStr){
 const events=[];
 state.meetings.filter(m=>!m.deleted_at&&m.meeting_date===dateStr).forEach(m=>events.push({type:"meeting",id:m.id,title:m.title,time:m.start_time?.slice(0,5)||"",location:m.location||""}));
 state.schedules.filter(s=>s.event_date===dateStr).forEach(s=>events.push({type:"schedule",id:s.id,title:s.title,time:s.event_time?.slice(0,5)||"",location:s.location||""}));
 return events.sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"));
}
function renderCalendar(){
 const base=new Date(state.calendarMonth.getFullYear(),state.calendarMonth.getMonth(),1);
 const y=base.getFullYear(),m=base.getMonth();
 $("#calendarMonthLabel").textContent=`${y}년 ${m+1}월`;
 if(!state.selectedDate) state.selectedDate=today();

 const firstWeekday=base.getDay();
 const gridStart=new Date(y,m,1-firstWeekday);
 const todayStr=today();
 let html="";
 for(let i=0;i<42;i++){
   const d=new Date(gridStart);d.setDate(gridStart.getDate()+i);
   const ds=isoLocalDate(d),sameMonth=d.getMonth()===m,events=calendarEventsFor(ds);
   const shown=events.slice(0,3);
   html+=`<div class="calendar-day ${sameMonth?"":"other-month"} ${ds===todayStr?"today":""} ${ds===state.selectedDate?"selected":""}" data-cal-date="${ds}">
     <div class="day-number">${d.getDate()}</div>
     <div class="cal-events">
       ${shown.map(ev=>`<div class="cal-event ${ev.type}" data-cal-type="${ev.type}" data-cal-id="${ev.id}" title="${esc(ev.title)}">${esc(ev.time?ev.time+" "+ev.title:ev.title)}</div>`).join("")}
       ${events.length>3?`<div class="cal-more">+${events.length-3}</div>`:""}
     </div>
   </div>`;
 }
 $("#calendarGrid").innerHTML=html;
 renderSelectedDay();
}
function renderSelectedDay(){
 const ds=state.selectedDate||today();
 const d=new Date(ds+"T00:00:00");
 $("#selectedDateLabel").textContent=new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"long"}).format(d);
 const events=calendarEventsFor(ds);
 $("#selectedDayList").innerHTML=events.length?events.map(ev=>`
   <article class="stack-card" data-agenda-type="${ev.type}" data-agenda-id="${ev.id}">
     <div class="compact-icon">${ev.type==="meeting"?"📝":"◷"}</div>
     <div class="stack-card-main">
       <h3>${esc(ev.title)}</h3>
       <p>${esc([ev.time,ev.location].filter(Boolean).join(" · "))}</p>
       <div class="stack-meta">${ev.type==="meeting"?"회의록":"일정"}</div>
     </div>
   </article>`).join(""):`<div class="empty" style="padding:28px 16px"><h3>이날 등록된 내용이 없습니다</h3><p>오른쪽 + 버튼으로 일정을 추가할 수 있습니다.</p></div>`;
}
function moveCalendar(delta){
 state.calendarMonth=new Date(state.calendarMonth.getFullYear(),state.calendarMonth.getMonth()+delta,1);renderCalendar()
}
function goCalendarToday(){
 const d=new Date();state.calendarMonth=new Date(d.getFullYear(),d.getMonth(),1);state.selectedDate=today();renderCalendar()
}

function renderNotices(){
 const rows=state.notices.slice().sort((a,b)=>(Number(b.pinned)-Number(a.pinned))||String(b.created_at).localeCompare(String(a.created_at)));
 $("#noticeList").innerHTML=rows.length?rows.map(n=>`<article class="stack-card" data-notice-id="${n.id}"><div class="pin">${n.pinned?"📌":"●"}</div><div class="stack-card-main"><h3>${esc(n.title)}</h3><p>${esc(n.body||"")}</p><div class="stack-meta">${esc(n.author||"익명")} · ${fmtDT(n.updated_at||n.created_at)}</div></div></article>`).join(""):`<div class="empty"><h3>공지사항이 없습니다</h3></div>`
}
function renderSchedules(){
 const rows=state.schedules.slice().sort((a,b)=>(a.event_date+(a.event_time||"")).localeCompare(b.event_date+(b.event_time||"")));
 $("#scheduleList").innerHTML=rows.length?rows.map(s=>{const d=monthDay(s.event_date);return`<article class="stack-card" data-schedule-id="${s.id}"><div class="schedule-date"><span>${d.m} ${d.w}</span><strong>${d.d}</strong></div><div class="stack-card-main"><h3>${esc(s.title)}</h3><p>${esc([s.event_time?.slice(0,5),s.location].filter(Boolean).join(" · "))}</p>${s.note?`<div class="stack-meta">${esc(s.note)}</div>`:""}</div></article>`}).join(""):`<div class="empty"><h3>등록된 일정이 없습니다</h3></div>`
}
function allTodos(includeDone=true){
 const arr=[];state.meetings.filter(m=>!m.deleted_at).forEach(m=>(m.actions||[]).forEach((a,i)=>{if(includeDone||!a.done)arr.push({...a,meetingId:m.id,meetingTitle:m.title,actionIndex:i,project:m.project})}));
 return arr.sort((a,b)=>(a.done-b.done)||String(a.due||"9999").localeCompare(String(b.due||"9999")))
}
function renderTodos(){
 let rows=allTodos(true);if(state.todoFilter==="open")rows=rows.filter(x=>!x.done);
 $("#todoList").innerHTML=rows.length?rows.map(t=>`<div class="todo-row ${t.done?"todo-done":""}" data-todo-meeting="${t.meetingId}" data-action-index="${t.actionIndex}"><input class="todo-check" type="checkbox" ${t.done?"checked":""}><div><div class="todo-title">${esc(t.task)}</div><div class="todo-sub">${esc(t.meetingTitle)} · ${esc(t.owner||"담당 미정")}</div></div><div class="todo-due">${t.due?fmtDate(t.due):""}</div></div>`).join(""):`<div class="empty"><h3>표시할 할 일이 없습니다</h3></div>`;
}

function addAction(a={}){
 const n=$("#actionRowTemplate").content.firstElementChild.cloneNode(true);n.querySelector(".action-done").checked=!!a.done;n.querySelector(".action-task").value=a.task||"";n.querySelector(".action-owner").value=a.owner||"";n.querySelector(".action-due").value=a.due||"";n.querySelector(".action-remove").onclick=()=>n.remove();$("#actionsList").appendChild(n)
}
function readActions(){return [...$("#actionsList").children].map(r=>({done:r.querySelector(".action-done").checked,task:r.querySelector(".action-task").value.trim(),owner:r.querySelector(".action-owner").value.trim(),due:r.querySelector(".action-due").value})).filter(x=>x.task||x.owner||x.due)}
function openMeeting(m=null,focusTitle=false){
 $("#actionsList").innerHTML="";$("#meetingId").value=m?.id||"";$("#meetingUpdatedAt").value=m?.updated_at||"";$("#titleInput").value=m?.title||"";$("#projectInput").value=m?.project||(state.project!=="전체"?state.project:"");$("#locationInput").value=m?.location||"";$("#dateInput").value=m?.meeting_date||today();$("#timeInput").value=m?.start_time?.slice(0,5)||"";$("#attendeesInput").value=m?.attendees||"";$("#summaryInput").value=m?.summary||"";$("#discussionInput").value=m?.discussion||"";$("#decisionsInput").value=m?.decisions||"";$("#linksInput").value=m?.links||"";(m?.actions||[]).forEach(addAction);if(!(m?.actions||[]).length)addAction();
 $("#meetingDialogTitle").textContent=m?m.title:"새 회의록";$("#historyBtn").classList.toggle("hidden",!m);$("#deleteMeetingBtn").classList.toggle("hidden",!m||!!m.deleted_at);$("#restoreMeetingBtn").classList.toggle("hidden",!m||!m.deleted_at);$("#saveMeetingBtn").classList.toggle("hidden",!!m?.deleted_at);$("#lastEditedText").textContent=m?`마지막 수정 ${fmtDT(m.updated_at)}${m.author?" · "+m.author:""}`:"";
 $("#meetingDialog").showModal();if(focusTitle)setTimeout(()=>{$("#titleInput").focus();$("#titleInput").select()},100)
}
async function saveMeeting(e){
 e.preventDefault();if(!$("#meetingForm").reportValidity())return;const author=await authorPrompt();const id=$("#meetingId").value,expected=$("#meetingUpdatedAt").value,p={title:$("#titleInput").value.trim(),project:$("#projectInput").value.trim(),location:$("#locationInput").value.trim(),meeting_date:$("#dateInput").value,start_time:$("#timeInput").value||null,attendees:$("#attendeesInput").value.trim(),summary:$("#summaryInput").value.trim(),discussion:$("#discussionInput").value.trim(),decisions:$("#decisionsInput").value.trim(),actions:readActions(),links:$("#linksInput").value.trim(),author};
 try{
  if(configured){
   if(id){let q=sb.from("meetings").update(p).eq("id",id);if(expected)q=q.eq("updated_at",expected);const r=await q.select().single();if(r.error)throw r.error;if(!r.data)throw new Error("다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.")}
   else{const r=await sb.from("meetings").insert(p);if(r.error)throw r.error}
  }else{
   const rows=localGet(KEYS.meetings);if(id){const i=rows.findIndex(x=>x.id===id),prev=structuredClone(rows[i]),h=rows[i]._history||[];h.unshift({created_at:now(),editor:author,snapshot:prev});rows[i]={...rows[i],...p,updated_at:now(),_history:h.slice(0,50)}}else rows.unshift({id:crypto.randomUUID(),...p,created_at:now(),updated_at:now(),deleted_at:null,_history:[]});localSet(KEYS.meetings,rows)
  }
  $("#meetingDialog").close();await loadAll()
 }catch(err){alert(err.message||"저장 실패")}
}
async function softDeleteMeeting(){
 const id=$("#meetingId").value;if(!id||!confirm("휴지통으로 보낼까요?"))return;const author=await authorPrompt();
 if(configured){const r=await sb.from("meetings").update({deleted_at:now(),author}).eq("id",id);if(r.error)return alert(r.error.message)}
 else{const rows=localGet(KEYS.meetings),i=rows.findIndex(x=>x.id===id);rows[i]={...rows[i],deleted_at:now(),updated_at:now(),author};localSet(KEYS.meetings,rows)}
 $("#meetingDialog").close();await loadAll()
}
async function restoreMeeting(){
 const id=$("#meetingId").value,author=await authorPrompt();if(configured){const r=await sb.from("meetings").update({deleted_at:null,author}).eq("id",id);if(r.error)return alert(r.error.message)}else{const rows=localGet(KEYS.meetings),i=rows.findIndex(x=>x.id===id);rows[i]={...rows[i],deleted_at:null,updated_at:now(),author};localSet(KEYS.meetings,rows)}$("#meetingDialog").close();state.trash=false;await loadAll()
}

function openNotice(n=null){$("#noticeId").value=n?.id||"";$("#noticeTitleInput").value=n?.title||"";$("#noticeBodyInput").value=n?.body||"";$("#noticePinnedInput").checked=!!n?.pinned;$("#deleteNoticeBtn").classList.toggle("hidden",!n);$("#noticeDialog").showModal()}
async function saveNotice(e){e.preventDefault();const author=await authorPrompt(),id=$("#noticeId").value,p={title:$("#noticeTitleInput").value.trim(),body:$("#noticeBodyInput").value.trim(),pinned:$("#noticePinnedInput").checked,author};
 if(configured){const r=id?await sb.from("announcements").update(p).eq("id",id):await sb.from("announcements").insert(p);if(r.error)return alert(r.error.message)}else{const rows=localGet(KEYS.notices);if(id){const i=rows.findIndex(x=>x.id===id);rows[i]={...rows[i],...p,updated_at:now()}}else rows.unshift({id:crypto.randomUUID(),...p,created_at:now(),updated_at:now()});localSet(KEYS.notices,rows)}$("#noticeDialog").close();await loadAll()}
async function deleteNotice(){const id=$("#noticeId").value;if(!id||!confirm("공지를 삭제할까요?"))return;if(configured){const r=await sb.from("announcements").delete().eq("id",id);if(r.error)return alert(r.error.message)}else localSet(KEYS.notices,localGet(KEYS.notices).filter(x=>x.id!==id));$("#noticeDialog").close();await loadAll()}

function openSchedule(s=null){$("#scheduleId").value=s?.id||"";$("#scheduleTitleInput").value=s?.title||"";$("#scheduleDateInput").value=s?.event_date||today();$("#scheduleTimeInput").value=s?.event_time?.slice(0,5)||"";$("#scheduleLocationInput").value=s?.location||"";$("#scheduleNoteInput").value=s?.note||"";$("#deleteScheduleBtn").classList.toggle("hidden",!s);$("#scheduleDialog").showModal()}
async function saveSchedule(e){e.preventDefault();const author=await authorPrompt(),id=$("#scheduleId").value,p={title:$("#scheduleTitleInput").value.trim(),event_date:$("#scheduleDateInput").value,event_time:$("#scheduleTimeInput").value||null,location:$("#scheduleLocationInput").value.trim(),note:$("#scheduleNoteInput").value.trim(),author};
 if(configured){const r=id?await sb.from("schedules").update(p).eq("id",id):await sb.from("schedules").insert(p);if(r.error)return alert(r.error.message)}else{const rows=localGet(KEYS.schedules);if(id){const i=rows.findIndex(x=>x.id===id);rows[i]={...rows[i],...p,updated_at:now()}}else rows.push({id:crypto.randomUUID(),...p,created_at:now(),updated_at:now()});localSet(KEYS.schedules,rows)}$("#scheduleDialog").close();await loadAll()}
async function deleteSchedule(){const id=$("#scheduleId").value;if(!id||!confirm("일정을 삭제할까요?"))return;if(configured){const r=await sb.from("schedules").delete().eq("id",id);if(r.error)return alert(r.error.message)}else localSet(KEYS.schedules,localGet(KEYS.schedules).filter(x=>x.id!==id));$("#scheduleDialog").close();await loadAll()}

async function toggleTodo(meetingId,idx,done){
 const m=state.meetings.find(x=>x.id===meetingId);if(!m)return;const author=await authorPrompt(),actions=structuredClone(m.actions||[]);if(!actions[idx])return;actions[idx].done=done;
 if(configured){const r=await sb.from("meetings").update({actions,author}).eq("id",meetingId);if(r.error)return alert(r.error.message)}
 else{const rows=localGet(KEYS.meetings),i=rows.findIndex(x=>x.id===meetingId);rows[i]={...rows[i],actions,author,updated_at:now()};localSet(KEYS.meetings,rows)}
 await loadAll()
}

async function showHistory(){
 const id=$("#meetingId").value;if(!id)return;$("#historyDialog").showModal();$("#historyList").innerHTML=`<p class="muted">불러오는 중…</p>`;
 let rows=[];if(configured){const r=await sb.from("meeting_revisions").select("*").eq("meeting_id",id).order("created_at",{ascending:false}).limit(50);if(r.error)return $("#historyList").innerHTML=`<p class="muted">이력을 불러오지 못했습니다.</p>`;rows=r.data||[]}else{const m=localGet(KEYS.meetings).find(x=>x.id===id);rows=(m?._history||[])}
 $("#historyList").innerHTML=rows.length?rows.map(x=>`<div class="history-item"><div><strong>${esc(x.editor||"익명")}</strong><small>${fmtDT(x.created_at)}</small></div></div>`).join(""):`<p class="muted">이전 버전이 없습니다.</p>`
}

$("#meetingForm").addEventListener("submit",saveMeeting);$("#noticeForm").addEventListener("submit",saveNotice);$("#scheduleForm").addEventListener("submit",saveSchedule);
$("#addActionBtn").onclick=()=>addAction();$("#deleteMeetingBtn").onclick=softDeleteMeeting;$("#restoreMeetingBtn").onclick=restoreMeeting;$("#historyBtn").onclick=showHistory;
$("#deleteNoticeBtn").onclick=deleteNotice;$("#deleteScheduleBtn").onclick=deleteSchedule;$("#refreshBtn").onclick=loadAll;
["newMeetingTopBtn","emptyNewMeetingBtn","newMeetingHomeBtn","fab"].forEach(id=>$("#"+id)?.addEventListener("click",()=>openMeeting()));
["addNoticeBtn","newNoticeTopBtn"].forEach(id=>$("#"+id)?.addEventListener("click",()=>openNotice()));
["addScheduleBtn","addScheduleHero","newScheduleTopBtn"].forEach(id=>$("#"+id)?.addEventListener("click",()=>openSchedule()));
$$("[data-nav]").forEach(b=>b.onclick=()=>setTab(b.dataset.nav));
$("#desktopQuickMeeting")?.addEventListener("click",()=>openMeeting());
$("#desktopQuickSchedule")?.addEventListener("click",()=>openSchedule());$$("[data-tab]").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));

$("#calendarPrevBtn").onclick=()=>moveCalendar(-1);
$("#calendarNextBtn").onclick=()=>moveCalendar(1);
$("#calendarTodayBtn").onclick=goCalendarToday;
$("#calendarAddScheduleBtn").onclick=()=>{openSchedule({event_date:state.selectedDate||today()})};
$("#calendarGrid").onclick=e=>{
 const ev=e.target.closest("[data-cal-type]");
 if(ev){
   e.stopPropagation();
   if(ev.dataset.calType==="meeting") return openMeeting(state.meetings.find(x=>x.id===ev.dataset.calId));
   return openSchedule(state.schedules.find(x=>x.id===ev.dataset.calId));
 }
 const day=e.target.closest("[data-cal-date]");
 if(day){state.selectedDate=day.dataset.calDate;const d=new Date(state.selectedDate+"T00:00:00");state.calendarMonth=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar()}
};
$("#selectedDayList").onclick=e=>{
 const row=e.target.closest("[data-agenda-type]");if(!row)return;
 if(row.dataset.agendaType==="meeting") openMeeting(state.meetings.find(x=>x.id===row.dataset.agendaId));
 else openSchedule(state.schedules.find(x=>x.id===row.dataset.agendaId));
};

$("#meetingSearch").oninput=e=>{state.q=e.target.value;renderMeetings()};$("#trashToggleBtn").onclick=()=>{state.trash=!state.trash;state.project="전체";renderMeetings()};
$("#projectChips").onclick=e=>{const b=e.target.closest("[data-project]");if(b){state.project=b.dataset.project;renderMeetings()}};
$("#meetingList").onclick=e=>{const q=e.target.closest("[data-quick-edit]");if(q){e.stopPropagation();const m=state.meetings.find(x=>x.id===q.dataset.quickEdit);return openMeeting(m,true)}const c=e.target.closest("[data-meeting-id]");if(c){const m=state.meetings.find(x=>x.id===c.dataset.meetingId);openMeeting(m)}};
$("#recentMeetingList").onclick=e=>{const c=e.target.closest("[data-meeting-id]");if(c){const m=state.meetings.find(x=>x.id===c.dataset.meetingId);openMeeting(m)}};
$("#noticeHomeList").onclick=e=>{const c=e.target.closest("[data-notice-id]");if(c)openNotice(state.notices.find(x=>x.id===c.dataset.noticeId))};$("#noticeList").onclick=$("#noticeHomeList").onclick;
$("#scheduleHomeList").onclick=e=>{const c=e.target.closest("[data-schedule-id]");if(c)openSchedule(state.schedules.find(x=>x.id===c.dataset.scheduleId))};$("#scheduleList").onclick=$("#scheduleHomeList").onclick;
$("#todoHomeList").onclick=e=>{const c=e.target.closest("[data-todo-meeting]");if(c){const m=state.meetings.find(x=>x.id===c.dataset.todoMeeting);openMeeting(m)}};
$("#todoList").onclick=e=>{const r=e.target.closest("[data-todo-meeting]");if(!r)return;if(e.target.classList.contains("todo-check"))toggleTodo(r.dataset.todoMeeting,Number(r.dataset.actionIndex),e.target.checked);else openMeeting(state.meetings.find(x=>x.id===r.dataset.todoMeeting))};
$$("[data-todo-filter]").forEach(b=>b.onclick=()=>{$$("[data-todo-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.todoFilter=b.dataset.todoFilter;renderTodos()});
$$("[data-close]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close)?.close());
$("#nameForm").onsubmit=e=>{e.preventDefault();const name=$("#authorInput").value.trim();if(!name)return;localStorage.setItem(KEYS.author,name);$("#nameDialog").close();if($("#nameForm")._resolve){$("#nameForm")._resolve(name);$("#nameForm")._resolve=null}};
$("#nameDialog").addEventListener("close",()=>{if($("#nameForm")._resolve){$("#nameForm")._resolve(getAuthor()||"익명");$("#nameForm")._resolve=null}});

document.title=cfg.appName||"모임 운영";$("#appTitle").textContent=cfg.appName||"모임 운영";setTab("home");
if(!configured)banner("미리보기 모드입니다. 현재 브라우저에만 저장됩니다. 여러 사람이 함께 쓰려면 config.js에 Supabase 값을 넣으세요.");
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
loadAll();if(configured)setInterval(loadAll,20000);
})();