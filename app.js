(() => {
"use strict";
const cfg=window.APP_CONFIG||{};
const configured=cfg.supabaseUrl&&!cfg.supabaseUrl.includes("YOUR_PROJECT")&&cfg.supabaseAnonKey&&!cfg.supabaseAnonKey.includes("YOUR_");
const sb=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={tab:"home",meetings:[],notices:[],schedules:[],posts:[],comments:[],polls:[],pollOptions:[],pollVotes:[],todos:[],todoComments:[],project:"전체",trash:false,q:"",postQ:"",todoFilter:"open",
  calendarMonth:new Date(new Date().getFullYear(),new Date().getMonth(),1),
  selectedDate:null};
const KEYS={meetings:"group-meetings-v2",notices:"group-notices-v2",schedules:"group-schedules-v2",posts:"group-posts-v1",comments:"group-comments-v1",polls:"group-post-polls-v1",pollOptions:"group-post-poll-options-v1",pollVotes:"group-post-poll-votes-v1",voter:"group-voter-id-v1",todos:"group-todos-v1",todoComments:"group-todo-comments-v1",author:"group-author-v2"};

function now(){return new Date().toISOString()}
function today(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function linkify(v=""){
 let s=esc(v);
 const md=[];
 s=s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi,(_,label,url)=>{const i=md.push(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`)-1;return `@@MDLINK${i}@@`});
 s=s.replace(/(^|[\s>])(https?:\/\/[^\s<]+)/gi,(m,prefix,url)=>{
  let trail="";while(/[.,!?;:)]$/.test(url)){trail=url.slice(-1)+trail;url=url.slice(0,-1)}
  return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${trail}`;
 });
 md.forEach((a,i)=>{s=s.replace(`@@MDLINK${i}@@`,a)});
 return s.replace(/\n/g,"<br>");
}
function fmtDate(s){if(!s)return"";const[y,m,d]=s.slice(0,10).split("-");return`${y}.${m}.${d}`}
function fmtDT(s){if(!s)return"";return new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(s))}
function monthDay(s){const d=new Date(s+"T00:00:00");return{m:`${d.getMonth()+1}월`,d:d.getDate(),w:new Intl.DateTimeFormat("ko-KR",{weekday:"short"}).format(d)}}
function getAuthor(){return localStorage.getItem(KEYS.author)||""}
function localGet(key,fallback=[]){try{const x=JSON.parse(localStorage.getItem(key)||"null");return Array.isArray(x)?x:fallback}catch{return fallback}}
function localSet(key,data){localStorage.setItem(key,JSON.stringify(data))}
function seed(){
 if(!localStorage.getItem(KEYS.meetings)) localSet(KEYS.meetings,[{id:crypto.randomUUID(),project:"운영회의",title:"샘플 정기모임",meeting_date:today(),start_time:"19:00",location:"온라인",attendees:"김OO, 이OO, 박OO",summary:"이번 달 일정과 준비사항을 확인했습니다.",discussion:"다음 모임 일정과 역할을 논의했습니다.",decisions:"다음 모임은 둘째 주 토요일로 정했습니다.",actions:[{task:"장소 후보 확인",owner:"김OO",due:today(),done:false},{task:"공지문 작성",owner:"이OO",due:today(),done:true}],links:"",author:"샘플",created_at:now(),updated_at:now(),deleted_at:null,_history:[]}]);
 if(!localStorage.getItem(KEYS.notices)) localSet(KEYS.notices,[{id:crypto.randomUUID(),title:"모임 운영 페이지가 열렸습니다",body:"공지, 일정, 회의록, 할 일을 한 곳에서 관리합니다.",pinned:true,author:"샘플",created_at:now(),updated_at:now()}]);
 if(!localStorage.getItem(KEYS.schedules)){const d=new Date();d.setDate(d.getDate()+7);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());localSet(KEYS.schedules,[{id:crypto.randomUUID(),title:"다음 정기모임",event_date:d.toISOString().slice(0,10),event_time:"19:00",location:"미정",note:"세부 장소는 추후 공지",is_public:false,author:"샘플",created_at:now(),updated_at:now()}])}
 if(!localStorage.getItem(KEYS.posts)) localSet(KEYS.posts,[{id:crypto.randomUUID(),title:"일반 게시판이 열렸습니다",body:"자유로운 이야기와 정보를 공유해보세요.\n\n링크도 바로 붙여넣을 수 있습니다: https://board-mate.github.io/arena/",author:"샘플",created_at:now(),updated_at:now()}]);
 if(!localStorage.getItem(KEYS.comments)) localSet(KEYS.comments,[]);
 if(!localStorage.getItem(KEYS.polls)) localSet(KEYS.polls,[]);
 if(!localStorage.getItem(KEYS.pollOptions)) localSet(KEYS.pollOptions,[]);
 if(!localStorage.getItem(KEYS.pollVotes)) localSet(KEYS.pollVotes,[]);
 if(!localStorage.getItem(KEYS.todos)) localSet(KEYS.todos,[]);
 if(!localStorage.getItem(KEYS.todoComments)) localSet(KEYS.todoComments,[]);
}
function banner(msg){const e=$("#modeBanner");e.textContent=msg;e.classList.remove("hidden")}
function authorPrompt(){
 if(getAuthor()) return Promise.resolve(getAuthor());
 return new Promise(resolve=>{const d=$("#nameDialog"),f=$("#nameForm");$("#authorInput").value="";f._resolve=resolve;d.showModal()})
}

async function loadAll(){
 try{
  if(configured){
   const [m,n,s,p,c,pl,po,pv,t,tc]=await Promise.all([
    sb.from("meetings").select("*").order("meeting_date",{ascending:false}).order("created_at",{ascending:false}),
    sb.from("announcements").select("*").order("pinned",{ascending:false}).order("created_at",{ascending:false}),
    sb.from("schedules").select("*").order("event_date",{ascending:true}).order("event_time",{ascending:true}),
    sb.from("posts").select("*").order("created_at",{ascending:false}),
    sb.from("post_comments").select("*").order("created_at",{ascending:true}),
    sb.from("post_polls").select("*").order("created_at",{ascending:true}),
    sb.from("post_poll_options").select("*").order("sort_order",{ascending:true}),
    sb.from("post_poll_votes").select("*").order("created_at",{ascending:true}),
    sb.from("todos").select("*").order("done",{ascending:true}).order("due",{ascending:true,nullsFirst:false}).order("created_at",{ascending:false}),
    sb.from("todo_comments").select("*").order("created_at",{ascending:true})
   ]);
   if(m.error)throw m.error;if(n.error)throw n.error;if(s.error)throw s.error;if(p.error)console.warn("게시판 테이블을 불러오지 못했습니다. schema.sql의 posts 마이그레이션을 확인하세요.",p.error);if(c.error)console.warn("게시판 댓글 테이블을 불러오지 못했습니다. migration_v7_comments.sql을 실행하세요.",c.error);if(pl.error||po.error||pv.error)console.warn("게시판 투표 테이블을 불러오지 못했습니다. migration_v9_polls.sql을 실행하세요.",pl.error||po.error||pv.error);if(t.error)console.warn("독립 할 일 테이블을 불러오지 못했습니다. migration_v6_todos.sql을 실행하세요.",t.error);if(tc.error)console.warn("할 일 댓글 테이블을 불러오지 못했습니다. migration_v8_todo_comments.sql을 실행하세요.",tc.error);
   state.meetings=m.data||[];state.notices=n.data||[];state.schedules=s.data||[];state.posts=p.error?[]:(p.data||[]);state.comments=c.error?[]:(c.data||[]);state.polls=pl.error?[]:(pl.data||[]);state.pollOptions=po.error?[]:(po.data||[]);state.pollVotes=pv.error?[]:(pv.data||[]);state.todos=t.error?[]:(t.data||[]);state.todoComments=tc.error?[]:(tc.data||[]);
  }else{
   seed();state.meetings=localGet(KEYS.meetings);state.notices=localGet(KEYS.notices);state.schedules=localGet(KEYS.schedules);state.posts=localGet(KEYS.posts);state.comments=localGet(KEYS.comments);state.polls=localGet(KEYS.polls);state.pollOptions=localGet(KEYS.pollOptions);state.pollVotes=localGet(KEYS.pollVotes);state.todos=localGet(KEYS.todos);state.todoComments=localGet(KEYS.todoComments)
  }
  renderAll();
 }catch(e){console.error(e);alert("데이터를 불러오지 못했습니다. Supabase 설정을 확인하세요.")}
}
function renderAll(){renderHome();renderMeetings();renderNotices();renderSchedules();renderPosts();renderTodos();renderCalendar();}

function setTab(tab){
 state.tab=tab;
 if(tab==="calendar") renderCalendar();
 $$(".view").forEach(v=>v.classList.add("hidden"));
 $(`#${tab}View`)?.classList.remove("hidden");
 $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.nav===tab));
 $$(".desktop-tab").forEach(b=>b.classList.toggle("active",b.dataset.nav===tab));
 $("#fab").classList.toggle("hidden",!(["meetings","todos"].includes(tab)));
 $("#fab").setAttribute("aria-label",tab==="todos"?"새 할 일":"새 회의록");
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
 $("#todoHomeList").innerHTML=todos.length?todos.map(t=>{const cc=todoComments(t).length;return`<div class="compact-item" data-todo-key="${esc(todoKey(t))}" data-todo-source="${t.source}" ${t.source==="meeting"?`data-todo-meeting="${t.meetingId}" data-action-index="${t.actionIndex}"`:`data-todo-id="${t.id}"`}><div class="compact-icon">✓</div><div class="compact-main"><div class="compact-title">${esc(t.task)}</div><div class="compact-sub">${esc(t.owner||"담당 미정")}${t.due?" · "+fmtDate(t.due):""}${t.source==="standalone"?" · 독립 할 일":""}${cc?` · 댓글 ${cc}`:""}</div></div></div>`}).join(""):`<p class="muted">남은 할 일이 없습니다.</p>`;

 const ss=upcomingSchedules().slice(0,4);
 $("#scheduleHomeList").innerHTML=ss.length?ss.map(s=>`<div class="compact-item" data-schedule-id="${s.id}"><div class="compact-icon">◷</div><div class="compact-main"><div class="compact-title">${esc(s.title)}</div><div class="compact-sub">${fmtDate(s.event_date)}${s.event_time?" · "+s.event_time.slice(0,5):""} · ${s.is_public?"Arena 공개":"비공개"}</div></div></div>`).join(""):`<p class="muted">예정 일정이 없습니다.</p>`;
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

function dateKey(d){return isoLocalDate(d)}
function addDays(dateStr,days){const d=new Date(dateStr+"T12:00:00");d.setDate(d.getDate()+days);return dateKey(d)}
function dayOfWeek(dateStr){return new Date(dateStr+"T12:00:00").getDay()}
const lunarFormatter=new Intl.DateTimeFormat("en-u-ca-chinese",{month:"numeric",day:"numeric"});
const holidayYearCache=new Map();
function koreanLunarParts(d){
 try{
  const parts=lunarFormatter.formatToParts(d);
  return {month:parts.find(x=>x.type==="month")?.value||"",day:parts.find(x=>x.type==="day")?.value||""};
 }catch{return {month:"",day:""}}
}
function koreanHolidays(year){
 if(holidayYearCache.has(year))return holidayYearCache.get(year);
 const entries=[];
 const add=(date,name,eligible=false,group="")=>entries.push({date,name,eligible,group});
 const nationalSub=year>=2021;
 add(`${year}-01-01`,"신정");
 add(`${year}-03-01`,"삼일절",nationalSub,"0301");
 if(year>=2026)add(`${year}-05-01`,"노동절",true,"0501");
 add(`${year}-05-05`,"어린이날",true,"0505");
 add(`${year}-06-06`,"현충일");
 if(year>=2026)add(`${year}-07-17`,"제헌절",true,"0717");
 add(`${year}-08-15`,"광복절",nationalSub,"0815");
 add(`${year}-10-03`,"개천절",nationalSub,"1003");
 add(`${year}-10-09`,"한글날",nationalSub,"1009");
 add(`${year}-12-25`,"성탄절",year>=2023,"1225");
 const special={
  "2024-04-10":"제22대 국회의원선거",
  "2024-10-01":"국군의 날 임시공휴일",
  "2025-01-27":"임시공휴일",
  "2025-06-03":"제21대 대통령선거",
  "2026-06-03":"제9회 전국동시지방선거"
 };
 for(const [date,name] of Object.entries(special))if(date.startsWith(`${year}-`))add(date,name);
 let seollal="",chuseok="",buddha="";
 for(let d=new Date(year,0,1,12);d.getFullYear()===year;d.setDate(d.getDate()+1)){
  const lp=koreanLunarParts(d),ds=dateKey(d);
  if(lp.month==="1"&&lp.day==="1")seollal=ds;
  if(lp.month==="8"&&lp.day==="15")chuseok=ds;
  if(lp.month==="4"&&lp.day==="8")buddha=ds;
 }
 if(seollal){add(addDays(seollal,-1),"설날 연휴",false,"seollal");add(seollal,"설날",true,"seollal");add(addDays(seollal,1),"설날 연휴",false,"seollal")}
 if(buddha)add(buddha,"부처님오신날",year>=2023,"buddha");
 if(chuseok){add(addDays(chuseok,-1),"추석 연휴",false,"chuseok");add(chuseok,"추석",true,"chuseok");add(addDays(chuseok,1),"추석 연휴",false,"chuseok")}
 const baseDates=new Map();for(const h of entries){if(!baseDates.has(h.date))baseDates.set(h.date,[]);baseDates.get(h.date).push(h)}
 const nextFree=(from)=>{let ds=addDays(from,1);while(baseDates.has(ds)||[0,6].includes(dayOfWeek(ds)))ds=addDays(ds,1);return ds};
 const addSubstitute=(groupItems,label,weekendMode)=>{
  const dates=groupItems.map(x=>x.date).sort();
  const overlaps=dates.some(ds=>(baseDates.get(ds)||[]).length>1);
  const weekend=dates.some(ds=>weekendMode==="sunday"?dayOfWeek(ds)===0:[0,6].includes(dayOfWeek(ds)));
  if(!overlaps&&!weekend)return;
  const ds=nextFree(dates[dates.length-1]);
  const h={date:ds,name:`${label} 대체공휴일`,eligible:false,group:`${label}-sub`};entries.push(h);baseDates.set(ds,[h]);
 };
 const seolGroup=entries.filter(x=>x.group==="seollal");if(seolGroup.length)addSubstitute(seolGroup,"설날","sunday");
 const chuGroup=entries.filter(x=>x.group==="chuseok");if(chuGroup.length)addSubstitute(chuGroup,"추석","sunday");
 const eligibleByDate=new Map();
 for(const h of entries.filter(x=>x.eligible&&!['seollal','chuseok'].includes(x.group))){if(!eligibleByDate.has(h.date))eligibleByDate.set(h.date,[]);eligibleByDate.get(h.date).push(h)}
 for(const [date,items] of eligibleByDate){
  const overlaps=(baseDates.get(date)||[]).length>1, weekend=[0,6].includes(dayOfWeek(date));
  if(!overlaps&&!weekend)continue;
  const ds=nextFree(date), label=items.length>1?"대체공휴일":`${items[0].name} 대체공휴일`;
  const sub={date:ds,name:label,eligible:false,group:`sub-${date}`};entries.push(sub);baseDates.set(ds,[sub]);
 }
 entries.sort((a,b)=>a.date.localeCompare(b.date));holidayYearCache.set(year,entries);return entries;
}
function holidayFor(dateStr){return koreanHolidays(Number(dateStr.slice(0,4))).filter(x=>x.date===dateStr)}

function calendarEventsFor(dateStr){
 const events=[];
 holidayFor(dateStr).forEach(h=>events.push({type:"holiday",id:`holiday-${dateStr}-${h.name}`,title:h.name,time:"",location:""}));
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
   const ds=isoLocalDate(d),sameMonth=d.getMonth()===m,events=calendarEventsFor(ds),holidays=events.filter(x=>x.type==="holiday");
   const shown=events.slice(0,3);
   html+=`<div class="calendar-day ${sameMonth?"":"other-month"} ${holidays.length?"holiday":""} ${ds===todayStr?"today":""} ${ds===state.selectedDate?"selected":""}" data-cal-date="${ds}">
     <div class="day-number">${d.getDate()}</div>
     ${holidays.length?`<div class="holiday-name" title="${esc(holidays.map(x=>x.title).join(", "))}">${esc(holidays[0].title)}</div>`:""}
     <div class="cal-events">
       ${shown.filter(ev=>ev.type!=="holiday").map(ev=>`<div class="cal-event ${ev.type}" data-cal-type="${ev.type}" data-cal-id="${ev.id}" title="${esc(ev.title)}">${esc(ev.time?ev.time+" "+ev.title:ev.title)}</div>`).join("")}
       ${events.filter(ev=>ev.type!=="holiday").length>3?`<div class="cal-more">+${events.filter(ev=>ev.type!=="holiday").length-3}</div>`:""}
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
     <div class="compact-icon">${ev.type==="meeting"?"📝":ev.type==="holiday"?"●":"◷"}</div>
     <div class="stack-card-main">
       <h3>${esc(ev.title)}</h3>
       <p>${esc([ev.time,ev.location].filter(Boolean).join(" · "))}</p>
       <div class="stack-meta">${ev.type==="meeting"?"회의록":ev.type==="holiday"?"공휴일":"일정"}</div>
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
 $("#scheduleList").innerHTML=rows.length?rows.map(s=>{const d=monthDay(s.event_date);return`<article class="stack-card" data-schedule-id="${s.id}"><div class="schedule-date"><span>${d.m} ${d.w}</span><strong>${d.d}</strong></div><div class="stack-card-main"><div class="schedule-title-row"><h3>${esc(s.title)}</h3><span class="visibility-badge ${s.is_public?"public":"private"}">${s.is_public?"Arena 공개":"비공개"}</span></div><p>${esc([s.event_time?.slice(0,5),s.location].filter(Boolean).join(" · "))}</p>${s.note?`<div class="stack-meta">${esc(s.note)}</div>`:""}</div></article>`}).join(""):`<div class="empty"><h3>등록된 일정이 없습니다</h3></div>`
}

function filteredPosts(){
 const q=state.postQ.trim().toLowerCase();
 return state.posts.filter(p=>!q||[p.title,p.body,p.author].join(" ").toLowerCase().includes(q));
}
function postComments(postId){return state.comments.filter(c=>c.post_id===postId).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)))}

function pollForPost(postId){return state.polls.find(x=>x.post_id===postId)}
function pollOptions(pollId){return state.pollOptions.filter(x=>x.poll_id===pollId).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))}
function pollVotes(pollId){return state.pollVotes.filter(x=>x.poll_id===pollId)}
function voterId(){let v=localStorage.getItem(KEYS.voter);if(!v){v=crypto.randomUUID();localStorage.setItem(KEYS.voter,v)}return v}
function postPollMeta(postId){const pl=pollForPost(postId);if(!pl)return"";return ` · 투표 ${pollVotes(pl.id).length}표${pl.closed?" · 마감":""}`}
function renderPostPoll(postId){const wrap=$("#postPollDetail"),pl=pollForPost(postId);if(!pl){wrap.classList.add("hidden");wrap.innerHTML="";return}const opts=pollOptions(pl.id),votes=pollVotes(pl.id),mine=votes.find(v=>v.voter_id===voterId()),total=votes.length;wrap.classList.remove("hidden");wrap.innerHTML=`<div class="poll-head"><div><span class="poll-badge">투표</span><h3>${esc(pl.question)}</h3></div><span class="muted">${pl.closed?"마감됨":total+"명 참여"}</span></div><form id="postPollVoteForm" class="poll-options">${opts.map(o=>{const c=votes.filter(v=>v.option_id===o.id).length,p=total?Math.round(c/total*100):0;return `<label class="poll-option ${mine?.option_id===o.id?"selected":""}"><div class="poll-option-row"><span><input type="radio" name="pollOption" value="${o.id}" ${mine?.option_id===o.id?"checked":""} ${pl.closed?"disabled":""}> ${esc(o.option_text)}</span><strong>${c}표 · ${p}%</strong></div><div class="poll-bar"><span style="width:${p}%"></span></div></label>`}).join("")}<div class="poll-actions">${pl.closed?`<span class="muted">투표가 마감되었습니다.</span>`:`<button type="submit" class="primary-btn">${mine?"선택 변경":"투표하기"}</button>`}<span class="muted">총 ${total}표</span></div></form>`;$("#postPollVoteForm")?.addEventListener("submit",savePollVote)}
async function savePollVote(e){e.preventDefault();const postId=$("#postDetailId").value,pl=pollForPost(postId);if(!pl||pl.closed)return;const fd=new FormData(e.currentTarget),optionId=fd.get("pollOption");if(!optionId)return alert("투표 항목을 선택해주세요.");const vid=voterId();if(configured){const r=await sb.from("post_poll_votes").upsert({poll_id:pl.id,option_id:optionId,voter_id:vid},{onConflict:"poll_id,voter_id"});if(r.error)return alert(r.error.message)}else{let rows=localGet(KEYS.pollVotes);const i=rows.findIndex(v=>v.poll_id===pl.id&&v.voter_id===vid);const row={id:i>=0?rows[i].id:crypto.randomUUID(),poll_id:pl.id,option_id:optionId,voter_id:vid,created_at:now()};if(i>=0)rows[i]=row;else rows.push(row);localSet(KEYS.pollVotes,rows)}await loadAll();renderPostPoll(postId)}
function setPollEditor(p=null){const pl=p?pollForPost(p.id):null,opts=pl?pollOptions(pl.id):[];$("#postPollEnabled").checked=!!pl;$("#postPollFields").classList.toggle("hidden",!pl);$("#postPollQuestion").value=pl?.question||"";$("#postPollClosed").checked=!!pl?.closed;const box=$("#postPollOptions");box.innerHTML="";(opts.length?opts:[{option_text:""},{option_text:""}]).forEach(o=>addPollOption(o.option_text));const locked=!!(pl&&pollVotes(pl.id).length>0);$("#postPollLockNote").classList.toggle("hidden",!locked);$("#postPollEnabled").disabled=locked;$("#postPollQuestion").disabled=locked;$$("#postPollFields .poll-option-input,#postPollFields .poll-remove-option").forEach(x=>x.disabled=locked);$("#addPollOptionBtn").disabled=locked}
function addPollOption(value="",i=null){const box=$("#postPollOptions");if(box.children.length>=10)return;const row=document.createElement("div");row.className="poll-option-edit-row";row.innerHTML=`<input class="poll-option-input" maxlength="120" placeholder="선택 항목" value="${esc(value)}"><button type="button" class="icon-btn poll-remove-option" aria-label="항목 삭제">✕</button>`;row.querySelector(".poll-remove-option").onclick=()=>{if(box.children.length<=2)return alert("투표 항목은 최소 2개가 필요합니다.");row.remove()};box.appendChild(row)}
async function syncPostPoll(postId){const enabled=$("#postPollEnabled").checked,existing=pollForPost(postId);if(!enabled){if(existing&&!pollVotes(existing.id).length){if(configured)await sb.from("post_polls").delete().eq("id",existing.id);else{localSet(KEYS.polls,localGet(KEYS.polls).filter(x=>x.id!==existing.id));localSet(KEYS.pollOptions,localGet(KEYS.pollOptions).filter(x=>x.poll_id!==existing.id))}}return}const question=$("#postPollQuestion").value.trim(),options=$$("#postPollOptions .poll-option-input").map(x=>x.value.trim()).filter(Boolean),closed=$("#postPollClosed").checked;if(!question)throw new Error("투표 질문을 입력해주세요.");if(options.length<2)throw new Error("투표 항목을 2개 이상 입력해주세요.");if(existing){if(configured){let r=await sb.from("post_polls").update({question,closed}).eq("id",existing.id);if(r.error)throw r.error;if(!pollVotes(existing.id).length){r=await sb.from("post_poll_options").delete().eq("poll_id",existing.id);if(r.error)throw r.error;r=await sb.from("post_poll_options").insert(options.map((x,i)=>({poll_id:existing.id,option_text:x,sort_order:i})));if(r.error)throw r.error}}else{let polls=localGet(KEYS.polls),i=polls.findIndex(x=>x.id===existing.id);polls[i]={...polls[i],question,closed};localSet(KEYS.polls,polls);if(!pollVotes(existing.id).length){let os=localGet(KEYS.pollOptions).filter(x=>x.poll_id!==existing.id);options.forEach((x,j)=>os.push({id:crypto.randomUUID(),poll_id:existing.id,option_text:x,sort_order:j}));localSet(KEYS.pollOptions,os)}}}else{const pid=crypto.randomUUID();if(configured){const r=await sb.from("post_polls").insert({post_id:postId,question,closed}).select().single();if(r.error)throw r.error;const rr=await sb.from("post_poll_options").insert(options.map((x,i)=>({poll_id:r.data.id,option_text:x,sort_order:i})));if(rr.error)throw rr.error}else{let ps=localGet(KEYS.polls);ps.push({id:pid,post_id:postId,question,closed,created_at:now()});localSet(KEYS.polls,ps);let os=localGet(KEYS.pollOptions);options.forEach((x,i)=>os.push({id:crypto.randomUUID(),poll_id:pid,option_text:x,sort_order:i}));localSet(KEYS.pollOptions,os)}}}

function renderPosts(){
 const rows=filteredPosts();
 $("#postCountMeta").textContent=`${rows.length}건`;
 $("#postList").innerHTML=rows.length?rows.map(p=>{const cc=postComments(p.id).length;return`<article class="stack-card board-card" data-post-id="${p.id}"><div class="compact-icon">▤</div><div class="stack-card-main"><h3>${esc(p.title)}</h3><p class="board-preview">${esc(p.body||"")}</p><div class="stack-meta">${esc(p.author||"익명")} · ${fmtDT(p.updated_at||p.created_at)} · 댓글 ${cc}${postPollMeta(p.id)}</div></div></article>`}).join(""):`<div class="empty"><div class="empty-icon">▤</div><h3>게시글이 없습니다</h3><p>첫 게시글을 작성해보세요.</p></div>`;
}
function openPost(p=null){
 $("#postId").value=p?.id||"";$("#postTitleInput").value=p?.title||"";$("#postBodyInput").value=p?.body||"";
 $("#postDialogTitle").textContent=p?"게시글 수정":"새 게시글";$("#deletePostBtn").classList.toggle("hidden",!p);
 $("#postEditedText").textContent=p?`마지막 수정 ${fmtDT(p.updated_at||p.created_at)}${p.author?" · "+p.author:""}`:"";setPollEditor(p);$("#postDialog").showModal();
}
function showPost(p){
 if(!p)return;
 $("#postDetailId").value=p.id;$("#postDetailTitle").textContent=p.title;$("#postDetailMeta").textContent=`${p.author||"익명"} · ${fmtDT(p.updated_at||p.created_at)}`;
 $("#postDetailBody").innerHTML=linkify(p.body||"");renderPostPoll(p.id);renderPostComments(p.id);$("#postDetailDialog").showModal();
}
function renderPostComments(postId){
 const rows=postComments(postId);$("#postCommentCount").textContent=`댓글 ${rows.length}`;
 $("#postCommentList").innerHTML=rows.length?rows.map(c=>`<div class="comment-item" data-comment-id="${c.id}"><div class="comment-head"><strong>${esc(c.author||"익명")}</strong><span>${fmtDT(c.created_at)}</span></div><div class="comment-body">${linkify(c.body||"")}</div><button type="button" class="comment-delete" data-delete-comment="${c.id}" aria-label="댓글 삭제">삭제</button></div>`).join(""):`<p class="muted comment-empty">아직 댓글이 없습니다.</p>`;
}
async function savePost(e){
 e.preventDefault();if(!$("#postForm").reportValidity())return;if($("#postPollEnabled").checked){const q=$("#postPollQuestion").value.trim(),os=$$("#postPollOptions .poll-option-input").map(x=>x.value.trim()).filter(Boolean);if(!q)return alert("투표 질문을 입력해주세요.");if(os.length<2)return alert("투표 항목을 2개 이상 입력해주세요.")}const author=await authorPrompt(),id=$("#postId").value,p={title:$("#postTitleInput").value.trim(),body:$("#postBodyInput").value.trim(),author};
 let savedId=id;
 if(configured){const r=id?await sb.from("posts").update(p).eq("id",id).select().single():await sb.from("posts").insert(p).select().single();if(r.error)return alert(r.error.message);savedId=r.data?.id||id}
 else{const rows=localGet(KEYS.posts);if(id){const i=rows.findIndex(x=>x.id===id);if(i>=0)rows[i]={...rows[i],...p,updated_at:now()}}else{savedId=crypto.randomUUID();rows.unshift({id:savedId,...p,created_at:now(),updated_at:now()})}localSet(KEYS.posts,rows)}
 try{await syncPostPoll(savedId)}catch(err){return alert(err.message||String(err))}$("#postDialog").close();await loadAll();const saved=state.posts.find(x=>x.id===savedId);if(saved)showPost(saved);
}
async function deletePost(){
 const id=$("#postId").value;if(!id||!confirm("게시글을 삭제할까요? 댓글과 투표도 함께 삭제됩니다."))return;
 if(configured){const r=await sb.from("posts").delete().eq("id",id);if(r.error)return alert(r.error.message)}
 else{const pl=localGet(KEYS.polls).find(x=>x.post_id===id);localSet(KEYS.posts,localGet(KEYS.posts).filter(x=>x.id!==id));localSet(KEYS.comments,localGet(KEYS.comments).filter(x=>x.post_id!==id));if(pl){localSet(KEYS.polls,localGet(KEYS.polls).filter(x=>x.id!==pl.id));localSet(KEYS.pollOptions,localGet(KEYS.pollOptions).filter(x=>x.poll_id!==pl.id));localSet(KEYS.pollVotes,localGet(KEYS.pollVotes).filter(x=>x.poll_id!==pl.id))}}
 $("#postDialog").close();$("#postDetailDialog")?.close();await loadAll();
}
async function saveComment(e){
 e.preventDefault();const postId=$("#postDetailId").value,body=$("#postCommentInput").value.trim();if(!postId||!body)return;
 const author=await authorPrompt(),row={post_id:postId,body,author};
 if(configured){const r=await sb.from("post_comments").insert(row);if(r.error)return alert(r.error.message)}
 else{const rows=localGet(KEYS.comments);rows.push({id:crypto.randomUUID(),...row,created_at:now()});localSet(KEYS.comments,rows)}
 $("#postCommentInput").value="";await loadAll();renderPostComments(postId);
}
async function deleteComment(id){
 if(!id||!confirm("댓글을 삭제할까요?"))return;const postId=$("#postDetailId").value;
 if(configured){const r=await sb.from("post_comments").delete().eq("id",id);if(r.error)return alert(r.error.message)}
 else localSet(KEYS.comments,localGet(KEYS.comments).filter(x=>x.id!==id));
 await loadAll();renderPostComments(postId);
}
function insertPostLink(){
 const ta=$("#postBodyInput"),url=prompt("연결할 주소를 입력하세요. (https://...)","https://");if(!url)return;
 if(!/^https?:\/\//i.test(url.trim()))return alert("http:// 또는 https://로 시작하는 주소를 입력해주세요.");
 const label=prompt("화면에 표시할 문구를 입력하세요. 비워두면 주소가 표시됩니다.","")||url.trim();
 const text=`[${label}](${url.trim()})`,start=ta.selectionStart??ta.value.length,end=ta.selectionEnd??ta.value.length;
 ta.setRangeText(text,start,end,"end");ta.focus();
}

function allTodos(includeDone=true){
 const arr=[];
 state.meetings.filter(m=>!m.deleted_at).forEach(m=>(m.actions||[]).forEach((a,i)=>{if(includeDone||!a.done)arr.push({...a,source:"meeting",meetingId:m.id,meetingTitle:m.title,actionIndex:i,project:m.project})}));
 state.todos.forEach(t=>{if(includeDone||!t.done)arr.push({...t,source:"standalone",meetingTitle:"",project:t.project||""})});
 return arr.sort((a,b)=>(Number(a.done)-Number(b.done))||String(a.due||"9999").localeCompare(String(b.due||"9999"))||String(b.created_at||"").localeCompare(String(a.created_at||"")))
}
function todoKey(t){return t.source==="meeting"?`meeting:${t.meetingId}:action:${t.actionIndex}`:`todo:${t.id}`}
function todoComments(tOrKey){const key=typeof tOrKey==="string"?tOrKey:todoKey(tOrKey);return state.todoComments.filter(c=>c.todo_key===key).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)))}
function findTodoByKey(key){return allTodos(true).find(t=>todoKey(t)===key)}
function renderTodos(){
 let rows=allTodos(true);if(state.todoFilter==="open")rows=rows.filter(x=>!x.done);
 $("#todoList").innerHTML=rows.length?rows.map(t=>{const cc=todoComments(t).length;return`<div class="todo-row ${t.done?"todo-done":""}" data-todo-key="${esc(todoKey(t))}" data-todo-source="${t.source}" ${t.source==="meeting"?`data-todo-meeting="${t.meetingId}" data-action-index="${t.actionIndex}"`:`data-todo-id="${t.id}"`}><input class="todo-check" type="checkbox" ${t.done?"checked":""}><div class="todo-main"><div class="todo-title">${esc(t.task)}</div><div class="todo-sub">${t.source==="meeting"?`${esc(t.meetingTitle)} · `:"독립 할 일 · "}${esc(t.owner||"담당 미정")}${t.project?` · ${esc(t.project)}`:""}${cc?` · 댓글 ${cc}`:""}</div></div><div class="todo-due">${t.due?fmtDate(t.due):""}</div></div>`}).join(""):`<div class="empty"><h3>표시할 할 일이 없습니다</h3><p>회의록 없이도 새 할 일을 바로 등록할 수 있습니다.</p></div>`;
}
function showTodoDetail(t){
 if(!t)return;const key=todoKey(t);
 $("#todoDetailKey").value=key;$("#todoDetailSource").value=t.source;$("#todoDetailId").value=t.id||"";$("#todoDetailMeetingId").value=t.meetingId||"";$("#todoDetailActionIndex").value=t.actionIndex??"";
 $("#todoDetailTitle").textContent=t.task||"할 일";
 $("#todoDetailMeta").textContent=[t.source==="meeting"?`회의록 · ${t.meetingTitle}`:"독립 할 일",t.owner||"담당 미정",t.due?`기한 ${fmtDate(t.due)}`:"",t.project||"",t.done?"완료":"미완료"].filter(Boolean).join(" · ");
 const note=t.source==="standalone"?(t.note||""):"";$("#todoDetailNote").innerHTML=note?linkify(note):`<span class="muted">${t.source==="meeting"?"세부 내용은 연결된 회의록에서 확인할 수 있습니다.":"등록된 메모가 없습니다."}</span>`;
 $("#editTodoFromDetailBtn").textContent=t.source==="meeting"?"회의록 열기":"할 일 수정";renderTodoComments(key);$("#todoDetailDialog").showModal();
}
function renderTodoComments(key){
 const rows=todoComments(key);$("#todoCommentCount").textContent=`댓글 ${rows.length}`;
 $("#todoCommentList").innerHTML=rows.length?rows.map(c=>`<div class="comment-item" data-todo-comment-id="${c.id}"><div class="comment-head"><strong>${esc(c.author||"익명")}</strong><span>${fmtDT(c.created_at)}</span></div><div class="comment-body">${linkify(c.body||"")}</div><button type="button" class="comment-delete" data-delete-todo-comment="${c.id}" aria-label="댓글 삭제">삭제</button></div>`).join(""):`<p class="muted comment-empty">아직 댓글이 없습니다.</p>`;
}
async function saveTodoComment(e){
 e.preventDefault();const key=$("#todoDetailKey").value,body=$("#todoCommentInput").value.trim();if(!key||!body)return;const author=await authorPrompt(),row={todo_key:key,body,author};
 if(configured){const r=await sb.from("todo_comments").insert(row);if(r.error)return alert(r.error.message)}else{const rows=localGet(KEYS.todoComments);rows.push({id:crypto.randomUUID(),...row,created_at:now()});localSet(KEYS.todoComments,rows)}
 $("#todoCommentInput").value="";await loadAll();renderTodoComments(key);
}
async function deleteTodoComment(id){
 if(!id||!confirm("댓글을 삭제할까요?"))return;const key=$("#todoDetailKey").value;
 if(configured){const r=await sb.from("todo_comments").delete().eq("id",id);if(r.error)return alert(r.error.message)}else localSet(KEYS.todoComments,localGet(KEYS.todoComments).filter(x=>x.id!==id));
 await loadAll();renderTodoComments(key);
}
function openTodo(t=null){
 $("#todoId").value=t?.id||"";$("#todoTaskInput").value=t?.task||"";$("#todoOwnerInput").value=t?.owner||"";$("#todoDueInput").value=t?.due||"";$("#todoProjectInput").value=t?.project||"";$("#todoNoteInput").value=t?.note||"";$("#todoDoneInput").checked=!!t?.done;
 $("#todoDialogTitle").textContent=t?"할 일 수정":"새 할 일";$("#deleteTodoBtn").classList.toggle("hidden",!t);$("#todoEditedText").textContent=t?`마지막 수정 ${fmtDT(t.updated_at||t.created_at)}${t.author?" · "+t.author:""}`:"";$("#todoDialog").showModal();
}
async function saveTodo(e){
 e.preventDefault();if(!$("#todoForm").reportValidity())return;const author=await authorPrompt(),id=$("#todoId").value,p={task:$("#todoTaskInput").value.trim(),owner:$("#todoOwnerInput").value.trim(),due:$("#todoDueInput").value||null,project:$("#todoProjectInput").value.trim(),note:$("#todoNoteInput").value.trim(),done:$("#todoDoneInput").checked,author};
 if(configured){const r=id?await sb.from("todos").update(p).eq("id",id):await sb.from("todos").insert(p);if(r.error)return alert(r.error.message)}
 else{const rows=localGet(KEYS.todos);if(id){const i=rows.findIndex(x=>x.id===id);if(i>=0)rows[i]={...rows[i],...p,updated_at:now()}}else rows.unshift({id:crypto.randomUUID(),...p,created_at:now(),updated_at:now()});localSet(KEYS.todos,rows)}
 $("#todoDialog").close();await loadAll();
}
async function deleteTodo(){
 const id=$("#todoId").value;if(!id||!confirm("할 일을 삭제할까요?"))return;
 if(configured){const c=await sb.from("todo_comments").delete().eq("todo_key",`todo:${id}`);if(c.error)console.warn(c.error);const r=await sb.from("todos").delete().eq("id",id);if(r.error)return alert(r.error.message)}else{localSet(KEYS.todos,localGet(KEYS.todos).filter(x=>x.id!==id));localSet(KEYS.todoComments,localGet(KEYS.todoComments).filter(x=>x.todo_key!==`todo:${id}`))}
 $("#todoDialog").close();$("#todoDetailDialog")?.close();await loadAll();
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

function openSchedule(s=null){$("#scheduleId").value=s?.id||"";$("#scheduleTitleInput").value=s?.title||"";$("#scheduleDateInput").value=s?.event_date||today();$("#scheduleTimeInput").value=s?.event_time?.slice(0,5)||"";$("#scheduleLocationInput").value=s?.location||"";$("#scheduleNoteInput").value=s?.note||"";$("#schedulePublicInput").checked=s?!!s.is_public:false;$("#deleteScheduleBtn").classList.toggle("hidden",!s);$("#scheduleDialog").showModal()}
async function saveSchedule(e){e.preventDefault();const author=await authorPrompt(),id=$("#scheduleId").value,p={title:$("#scheduleTitleInput").value.trim(),event_date:$("#scheduleDateInput").value,event_time:$("#scheduleTimeInput").value||null,location:$("#scheduleLocationInput").value.trim(),note:$("#scheduleNoteInput").value.trim(),is_public:$("#schedulePublicInput").checked,author};
 if(configured){const r=id?await sb.from("schedules").update(p).eq("id",id):await sb.from("schedules").insert(p);if(r.error)return alert(r.error.message)}else{const rows=localGet(KEYS.schedules);if(id){const i=rows.findIndex(x=>x.id===id);rows[i]={...rows[i],...p,updated_at:now()}}else rows.push({id:crypto.randomUUID(),...p,created_at:now(),updated_at:now()});localSet(KEYS.schedules,rows)}$("#scheduleDialog").close();await loadAll()}
async function deleteSchedule(){const id=$("#scheduleId").value;if(!id||!confirm("일정을 삭제할까요?"))return;if(configured){const r=await sb.from("schedules").delete().eq("id",id);if(r.error)return alert(r.error.message)}else localSet(KEYS.schedules,localGet(KEYS.schedules).filter(x=>x.id!==id));$("#scheduleDialog").close();await loadAll()}

async function toggleTodo(meetingId,idx,done){
 const m=state.meetings.find(x=>x.id===meetingId);if(!m)return;const author=await authorPrompt(),actions=structuredClone(m.actions||[]);if(!actions[idx])return;actions[idx].done=done;
 if(configured){const r=await sb.from("meetings").update({actions,author}).eq("id",meetingId);if(r.error)return alert(r.error.message)}
 else{const rows=localGet(KEYS.meetings),i=rows.findIndex(x=>x.id===meetingId);rows[i]={...rows[i],actions,author,updated_at:now()};localSet(KEYS.meetings,rows)}
 await loadAll()
}

async function toggleStandaloneTodo(id,done){
 const author=await authorPrompt();
 if(configured){const r=await sb.from("todos").update({done,author}).eq("id",id);if(r.error)return alert(r.error.message)}
 else{const rows=localGet(KEYS.todos),i=rows.findIndex(x=>x.id===id);if(i<0)return;rows[i]={...rows[i],done,author,updated_at:now()};localSet(KEYS.todos,rows)}
 await loadAll();
}

async function showHistory(){
 const id=$("#meetingId").value;if(!id)return;$("#historyDialog").showModal();$("#historyList").innerHTML=`<p class="muted">불러오는 중…</p>`;
 let rows=[];if(configured){const r=await sb.from("meeting_revisions").select("*").eq("meeting_id",id).order("created_at",{ascending:false}).limit(50);if(r.error)return $("#historyList").innerHTML=`<p class="muted">이력을 불러오지 못했습니다.</p>`;rows=r.data||[]}else{const m=localGet(KEYS.meetings).find(x=>x.id===id);rows=(m?._history||[])}
 $("#historyList").innerHTML=rows.length?rows.map(x=>`<div class="history-item"><div><strong>${esc(x.editor||"익명")}</strong><small>${fmtDT(x.created_at)}</small></div></div>`).join(""):`<p class="muted">이전 버전이 없습니다.</p>`
}

$("#meetingForm").addEventListener("submit",saveMeeting);$("#noticeForm").addEventListener("submit",saveNotice);$("#scheduleForm").addEventListener("submit",saveSchedule);$("#postForm").addEventListener("submit",savePost);$("#postCommentForm").addEventListener("submit",saveComment);$("#todoForm").addEventListener("submit",saveTodo);$("#todoCommentForm").addEventListener("submit",saveTodoComment);
$("#addActionBtn").onclick=()=>addAction();$("#deleteMeetingBtn").onclick=softDeleteMeeting;$("#restoreMeetingBtn").onclick=restoreMeeting;$("#historyBtn").onclick=showHistory;
$("#postPollEnabled").onchange=e=>$("#postPollFields").classList.toggle("hidden",!e.target.checked);$("#addPollOptionBtn").onclick=()=>addPollOption();
$("#deleteNoticeBtn").onclick=deleteNotice;$("#deleteScheduleBtn").onclick=deleteSchedule;$("#deletePostBtn").onclick=deletePost;$("#deleteTodoBtn").onclick=deleteTodo;$("#refreshBtn").onclick=loadAll;$("#insertPostLinkBtn").onclick=insertPostLink;
["newMeetingTopBtn","emptyNewMeetingBtn","newMeetingHomeBtn"].forEach(id=>$("#"+id)?.addEventListener("click",()=>openMeeting()));
["addNoticeBtn","newNoticeTopBtn"].forEach(id=>$("#"+id)?.addEventListener("click",()=>openNotice()));
["addScheduleBtn","addScheduleHero","newScheduleTopBtn"].forEach(id=>$("#"+id)?.addEventListener("click",()=>openSchedule()));
["newPostTopBtn"].forEach(id=>$("#"+id)?.addEventListener("click",()=>openPost()));
["newTodoTopBtn","newTodoHomeBtn"].forEach(id=>$("#"+id)?.addEventListener("click",()=>openTodo()));
$("#fab")?.addEventListener("click",()=>state.tab==="todos"?openTodo():openMeeting());
$$("[data-nav]").forEach(b=>b.onclick=()=>setTab(b.dataset.nav));
$("#desktopQuickMeeting")?.addEventListener("click",()=>openMeeting());
$("#desktopQuickSchedule")?.addEventListener("click",()=>openSchedule());$("#desktopQuickTodo")?.addEventListener("click",()=>openTodo());$$("[data-tab]").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));

$("#calendarPrevBtn").onclick=()=>moveCalendar(-1);
$("#calendarNextBtn").onclick=()=>moveCalendar(1);
$("#calendarTodayBtn").onclick=goCalendarToday;
$("#calendarAddScheduleBtn").onclick=()=>{openSchedule({event_date:state.selectedDate||today()})};
$("#calendarGrid").onclick=e=>{
 const ev=e.target.closest("[data-cal-type]");
 if(ev){
   e.stopPropagation();
   if(ev.dataset.calType==="meeting") return openMeeting(state.meetings.find(x=>x.id===ev.dataset.calId));
   if(ev.dataset.calType==="schedule") return openSchedule(state.schedules.find(x=>x.id===ev.dataset.calId));
   return;
 }
 const day=e.target.closest("[data-cal-date]");
 if(day){state.selectedDate=day.dataset.calDate;const d=new Date(state.selectedDate+"T00:00:00");state.calendarMonth=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar()}
};
$("#selectedDayList").onclick=e=>{
 const row=e.target.closest("[data-agenda-type]");if(!row)return;
 if(row.dataset.agendaType==="meeting") openMeeting(state.meetings.find(x=>x.id===row.dataset.agendaId));
 else if(row.dataset.agendaType==="schedule") openSchedule(state.schedules.find(x=>x.id===row.dataset.agendaId));
};

$("#meetingSearch").oninput=e=>{state.q=e.target.value;renderMeetings()};$("#trashToggleBtn").onclick=()=>{state.trash=!state.trash;state.project="전체";renderMeetings()};
$("#projectChips").onclick=e=>{const b=e.target.closest("[data-project]");if(b){state.project=b.dataset.project;renderMeetings()}};
$("#meetingList").onclick=e=>{const q=e.target.closest("[data-quick-edit]");if(q){e.stopPropagation();const m=state.meetings.find(x=>x.id===q.dataset.quickEdit);return openMeeting(m,true)}const c=e.target.closest("[data-meeting-id]");if(c){const m=state.meetings.find(x=>x.id===c.dataset.meetingId);openMeeting(m)}};
$("#recentMeetingList").onclick=e=>{const c=e.target.closest("[data-meeting-id]");if(c){const m=state.meetings.find(x=>x.id===c.dataset.meetingId);openMeeting(m)}};
$("#noticeHomeList").onclick=e=>{const c=e.target.closest("[data-notice-id]");if(c)openNotice(state.notices.find(x=>x.id===c.dataset.noticeId))};$("#noticeList").onclick=$("#noticeHomeList").onclick;
$("#scheduleHomeList").onclick=e=>{const c=e.target.closest("[data-schedule-id]");if(c)openSchedule(state.schedules.find(x=>x.id===c.dataset.scheduleId))};$("#scheduleList").onclick=$("#scheduleHomeList").onclick;
$("#postSearch").oninput=e=>{state.postQ=e.target.value;renderPosts()};$("#postList").onclick=e=>{const c=e.target.closest("[data-post-id]");if(c)showPost(state.posts.find(x=>x.id===c.dataset.postId))};
$("#editPostFromDetailBtn").onclick=()=>{const p=state.posts.find(x=>x.id===$("#postDetailId").value);$("#postDetailDialog").close();if(p)openPost(p)};
$("#postCommentList").onclick=e=>{const b=e.target.closest("[data-delete-comment]");if(b)deleteComment(b.dataset.deleteComment)};
$("#todoHomeList").onclick=e=>{const r=e.target.closest("[data-todo-key]");if(r)showTodoDetail(findTodoByKey(r.dataset.todoKey))};
$("#todoList").onclick=e=>{const r=e.target.closest("[data-todo-source]");if(!r)return;if(e.target.classList.contains("todo-check")){if(r.dataset.todoSource==="meeting")toggleTodo(r.dataset.todoMeeting,Number(r.dataset.actionIndex),e.target.checked);else toggleStandaloneTodo(r.dataset.todoId,e.target.checked);return}showTodoDetail(findTodoByKey(r.dataset.todoKey));};
$("#editTodoFromDetailBtn").onclick=()=>{const key=$("#todoDetailKey").value,t=findTodoByKey(key);$("#todoDetailDialog").close();if(!t)return;if(t.source==="meeting")openMeeting(state.meetings.find(x=>x.id===t.meetingId));else openTodo(state.todos.find(x=>x.id===t.id))};
$("#todoCommentList").onclick=e=>{const b=e.target.closest("[data-delete-todo-comment]");if(b)deleteTodoComment(b.dataset.deleteTodoComment)};
$$("[data-todo-filter]").forEach(b=>b.onclick=()=>{$$("[data-todo-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.todoFilter=b.dataset.todoFilter;renderTodos()});
$$("[data-close]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close)?.close());
$("#nameForm").onsubmit=e=>{e.preventDefault();const name=$("#authorInput").value.trim();if(!name)return;localStorage.setItem(KEYS.author,name);$("#nameDialog").close();if($("#nameForm")._resolve){$("#nameForm")._resolve(name);$("#nameForm")._resolve=null}};
$("#nameDialog").addEventListener("close",()=>{if($("#nameForm")._resolve){$("#nameForm")._resolve(getAuthor()||"익명");$("#nameForm")._resolve=null}});

document.title=cfg.appName||"모임 운영";$("#appTitle").textContent=cfg.appName||"모임 운영";setTab("home");
if(!configured)banner("미리보기 모드입니다. 현재 브라우저에만 저장됩니다. 여러 사람이 함께 쓰려면 config.js에 Supabase 값을 넣으세요.");
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
loadAll();if(configured)setInterval(loadAll,20000);
})();