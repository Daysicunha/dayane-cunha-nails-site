(function(){
  const KEY='agendaflow-one-preview-v1';
  const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const pad=n=>String(n).padStart(2,'0');
  const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const addDays=(iso,n)=>{const [y,m,d]=iso.split('-').map(Number);const x=new Date(y,m-1,d+n);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`};
  const weekday=iso=>{const [y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d).getDay()};
  const minToTime=m=>`${pad(Math.floor(m/60))}:${pad(m%60)}`;
  const timeToMin=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v));
  const dateLabel=(iso,long=false)=>{const [y,m,d]=iso.split('-').map(Number);const dt=new Date(y,m-1,d);return new Intl.DateTimeFormat('pt-BR',long?{weekday:'long',day:'2-digit',month:'long'}:{day:'2-digit',month:'2-digit'}).format(dt)};
  const dayShort=iso=>{const [y,m,d]=iso.split('-').map(Number);return new Intl.DateTimeFormat('pt-BR',{weekday:'short'}).format(new Date(y,m-1,d)).replace('.','')};
  const uid=prefix=>`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const normPhone=p=>String(p||'').replace(/\D/g,'');
  const overlap=(aStart,aEnd,bStart,bEnd)=>aStart<bEnd && aEnd>bStart;

  function seed(){
    const t=todayISO(), tomorrow=addDays(t,1);
    return {
      services:[
        {id:'manicure',name:'Manicure',price:35,duration:60,active:true,description:'Cuticulagem e esmaltação com acabamento impecável.'},
        {id:'pedicure',name:'Pedicure',price:35,duration:60,active:true,description:'Cuidado completo para pés bem tratados e elegantes.'},
        {id:'cuticulagem',name:'Cuticulagem',price:20,duration:60,active:true,description:'Remoção cuidadosa das cutículas com técnica e precisão.'},
        {id:'pe-mao',name:'Pé e Mão',price:60,duration:60,active:true,description:'Combo completo para mãos e pés no mesmo atendimento.'}
      ],
      businessHours:{
        0:{active:false,start:'08:00',end:'18:00'},1:{active:false,start:'08:00',end:'18:00'},
        2:{active:true,start:'08:00',end:'18:00'},3:{active:true,start:'08:00',end:'18:00'},4:{active:true,start:'08:00',end:'18:00'},5:{active:true,start:'08:00',end:'18:00'},6:{active:true,start:'07:00',end:'18:00'}
      },
      customers:[
        {id:'c1',name:'Ana Paula',phone:'31990001111'},{id:'c2',name:'Patrícia',phone:'31991112222'},{id:'c3',name:'Fernanda',phone:'31992223333'}
      ],
      appointments:[
        {id:'a1',customerId:'c1',serviceId:'manicure',date:t,start:'09:00',end:'10:00',price:35,status:'agendado',source:'preview'},
        {id:'a2',customerId:'c2',serviceId:'pe-mao',date:t,start:'14:00',end:'15:00',price:60,status:'agendado',source:'preview'},
        {id:'a3',customerId:'c3',serviceId:'pedicure',date:t,start:'16:00',end:'17:00',price:35,status:'agendado',source:'preview'},
        {id:'a4',customerId:'c1',serviceId:'pedicure',date:tomorrow,start:'10:00',end:'11:00',price:35,status:'agendado',source:'preview'}
      ],
      blocks:[{id:'b1',date:t,start:'12:00',end:'13:00',reason:'Almoço'}]
    };
  }
  function normalize(data){
    if(!data||!data.services)return seed();
    let changed=false;
    data.services.forEach(s=>{if(Number(s.duration)!==60){s.duration=60;changed=true}});
    if(changed)save(data);
    return data;
  }
  function load(){try{const d=JSON.parse(localStorage.getItem(KEY));return normalize(d&&d.services?d:seed())}catch(e){return seed()}}
  function save(data){localStorage.setItem(KEY,JSON.stringify(data))}
  function reset(){const d=seed();save(d);return d}
  function customerOf(data,id){return data.customers.find(c=>c.id===id)||{name:'Cliente',phone:''}}
  function serviceOf(data,id){return data.services.find(s=>s.id===id)||{name:'Serviço',duration:60,price:0}}
  function slotsFor(data,date,serviceId){
    const service=serviceOf(data,serviceId), h=data.businessHours[weekday(date)]; if(!h||!h.active||!service.active)return [];
    const start=timeToMin(h.start), end=timeToMin(h.end), duration=60, out=[];
    const busy=[];
    data.appointments.filter(a=>a.date===date&&a.status!=='cancelado').forEach(a=>busy.push([timeToMin(a.start),timeToMin(a.end)]));
    data.blocks.filter(b=>b.date===date).forEach(b=>busy.push([timeToMin(b.start),timeToMin(b.end)]));
    for(let m=start;m+duration<=end;m+=60){if(!busy.some(([s,e])=>overlap(m,m+duration,s,e)))out.push(minToTime(m))}
    return out;
  }
  function ensureCustomer(data,name,phone){const n=normPhone(phone);let c=data.customers.find(x=>normPhone(x.phone)===n);if(c){c.name=name;c.phone=n;return c}c={id:uid('c'),name,phone:n};data.customers.push(c);return c}
  function addAppointment(data,{name,phone,serviceId,date,start}){
    const svc=serviceOf(data,serviceId); if(!slotsFor(data,date,serviceId).includes(start)) throw new Error('Horário indisponível');
    const customer=ensureCustomer(data,name,phone); const end=minToTime(timeToMin(start)+60);
    const ap={id:uid('a'),customerId:customer.id,serviceId,date,start,end,price:Number(svc.price),status:'agendado',source:'manual'};data.appointments.push(ap);save(data);return ap;
  }
  function toast(msg){let el=$('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el)}el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
  window.AgendaFlowOne={KEY,load,save,reset,slotsFor,serviceOf,customerOf,addAppointment,todayISO,addDays,dateLabel,dayShort,money,timeToMin,minToTime,overlap,weekday,uid,toast};

  if(document.body.dataset.page==='booking') initBooking();
  if(document.body.dataset.page==='panel') initPanel();

  function initBooking(){
    let data=load(); let state={serviceId:null,date:null,time:null,name:'',phone:''}; let step=1;
    const mount=$('#booking-step'); const bars=$$('.step');
    const render=()=>{bars.forEach((b,i)=>b.classList.toggle('active',i<step)); if(step===1)serviceStep();if(step===2)dateStep();if(step===3)timeStep();if(step===4)detailsStep();if(step===5)successStep()};
    function topSummary(){const s=state.serviceId?serviceOf(data,state.serviceId):null;return `<div class="booking-summary">${s?`<span><strong>Serviço:</strong> ${s.name}</span>`:''}${state.date?`<span><strong>Data:</strong> ${dateLabel(state.date,true)}</span>`:''}${state.time?`<span><strong>Horário:</strong> ${state.time}</span>`:''}</div>`}
    function serviceStep(){mount.innerHTML=`<div class="booking-card"><span class="af-tag">Agendamento online</span><h1>Qual cuidado você quer agendar?</h1><p class="muted">Escolha um serviço para ver os dias e horários disponíveis.</p><div class="choice-grid">${data.services.filter(s=>s.active).map(s=>`<button class="service-option ${state.serviceId===s.id?'selected':''}" data-service="${s.id}"><div class="service-option-head"><h3>${s.name}</h3><span class="price">${money(s.price)}</span></div><p>${s.description||''}</p><div class="service-meta"><span class="chip">60 min</span><span class="chip">Dayane Cunha</span></div></button>`).join('')}</div></div>`;$$('[data-service]',mount).forEach(b=>b.onclick=()=>{state.serviceId=b.dataset.service;state.date=null;state.time=null;step=2;render()})}
    function dateStep(){const dates=[];for(let i=0;i<18;i++){const d=addDays(todayISO(),i);const h=data.businessHours[weekday(d)];if(h&&h.active)dates.push(d);if(dates.length===12)break}mount.innerHTML=`<div class="booking-card"><span class="af-tag">Escolha a data</span><h1>Quando fica melhor para você?</h1><p class="muted">Mostramos apenas os dias em que a Dayane atende.</p>${topSummary()}<div class="date-grid">${dates.map(d=>{const [y,m,day]=d.split('-');return `<button class="date-option ${state.date===d?'selected':''}" data-date="${d}"><span class="dow">${dayShort(d)}</span><strong>${day}</strong><small>${new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(Number(y),Number(m)-1,Number(day))).replace('.','')}</small></button>`}).join('')}</div><div class="booking-actions"><button class="btn btn-outline" id="back">← Voltar</button></div></div>`;$('#back').onclick=()=>{step=1;render()};$$('[data-date]',mount).forEach(b=>b.onclick=()=>{state.date=b.dataset.date;state.time=null;step=3;render()})}
    function timeStep(){const slots=slotsFor(data,state.date,state.serviceId);mount.innerHTML=`<div class="booking-card"><span class="af-tag">Escolha o horário</span><h1>Qual horário funciona para você?</h1><p class="muted">A disponibilidade já considera outros agendamentos e horários bloqueados.</p>${topSummary()}${slots.length?`<div class="time-grid">${slots.map(t=>`<button class="time-option ${state.time===t?'selected':''}" data-time="${t}">${t}</button>`).join('')}</div>`:`<div class="empty-state">Não há horários disponíveis para esse serviço nesta data. Escolha outro dia.</div>`}<div class="booking-actions"><button class="btn btn-outline" id="back">← Voltar</button></div></div>`;$('#back').onclick=()=>{step=2;render()};$$('[data-time]',mount).forEach(b=>b.onclick=()=>{state.time=b.dataset.time;step=4;render()})}
    function detailsStep(){mount.innerHTML=`<div class="booking-card"><span class="af-tag">Seus dados</span><h1>Falta só confirmar.</h1><p class="muted">Informe seu nome e WhatsApp para identificar o agendamento.</p>${topSummary()}<form id="booking-form" class="form-grid"><div class="field"><label>Nome</label><input name="name" required minlength="2" placeholder="Seu nome" value="${state.name||''}"></div><div class="field"><label>WhatsApp</label><input name="phone" required inputmode="tel" placeholder="(31) 99999-9999" value="${state.phone||''}"></div><div class="booking-actions full"><button type="button" class="btn btn-outline" id="back">← Voltar</button><button class="btn btn-primary">Confirmar agendamento →</button></div></form></div>`;$('#back').onclick=()=>{step=3;render()};$('#booking-form').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);state.name=String(fd.get('name')).trim();state.phone=String(fd.get('phone')).trim();try{data=load();const ap=addAppointment(data,{...state});state.appointment=ap;step=5;render()}catch(err){toast('Esse horário acabou de ficar indisponível. Escolha outro.');step=3;render()}}}
    function successStep(){const s=serviceOf(data,state.serviceId);mount.innerHTML=`<div class="booking-card"><div class="success-card"><div class="success-icon">✓</div><span class="af-tag">Confirmado</span><h2>Seu horário está reservado.</h2><p>Pronto, ${state.name.split(' ')[0]||''}. A Dayane já tem seu agendamento na agenda.</p><div class="success-details"><strong>${s.name}</strong><div class="muted">${dateLabel(state.date,true)} às ${state.time}</div><div class="muted">${money(s.price)} • 60 min</div></div><a class="btn btn-primary" target="_blank" rel="noopener" href="https://wa.me/5531982133437">Falar com a Dayane</a><button class="btn btn-soft" id="new-booking" style="margin-left:8px">Fazer outro agendamento</button></div></div>`;$('#new-booking').onclick=()=>{state={serviceId:null,date:null,time:null,name:'',phone:''};step=1;render()}}
    render();
  }
  function initPanel(){
    let data=load(); let active='today';
    const titles={today:['Hoje','Visão rápida dos atendimentos e horários livres.'],agenda:['Agenda','Consulte os compromissos por dia.'],new:['Novo agendamento','Lance clientes que marcaram pelo WhatsApp ou pessoalmente.'],block:['Bloquear horário','Reserve períodos para almoço, médico, compromisso ou folga.'],services:['Serviços','Altere nome, preço e disponibilidade. A duração padrão é de 1 hora.'],hours:['Horários de atendimento','Defina os dias e faixas em que a agenda pode receber horários.'],clients:['Clientes','Nome, telefone e histórico básico de atendimentos.']};
    const switchView=id=>{active=id;$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${id}`));$$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));const [t,p]=titles[id];$('#page-title-text').textContent=t;$('#page-title-sub').textContent=p;document.querySelector('.sidebar').classList.remove('open');renderView(id)};
    $$('.nav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));$$('[data-go]').forEach(b=>b.onclick=()=>switchView(b.dataset.go));$('#mobile-menu').onclick=()=>$('.sidebar').classList.toggle('open');
    $('#reset-preview').onclick=()=>{if(confirm('Restaurar os dados demonstrativos da prévia?')){data=reset();renderView(active);toast('Dados da prévia restaurados')}};

    function renderView(id){data=load();if(id==='today')renderToday();if(id==='agenda')renderAgenda();if(id==='new')renderNew();if(id==='block')renderBlock();if(id==='services')renderServices();if(id==='hours')renderHours();if(id==='clients')renderClients()}
    function renderToday(){const t=todayISO(), aps=data.appointments.filter(a=>a.date===t&&a.status!=='cancelado').sort((a,b)=>a.start.localeCompare(b.start));const free=slotsFor(data,t,'manicure').slice(0,10);$('#today-date').textContent=dateLabel(t,true);$('#kpi-appointments').textContent=aps.length;$('#kpi-clients').textContent=new Set(aps.map(a=>a.customerId)).size;$('#kpi-free').textContent=free.length;$('#kpi-revenue').textContent=money(aps.reduce((sum,a)=>sum+Number(a.price||0),0));$('#today-list').innerHTML=aps.length?aps.map(a=>appointmentRow(a)).join(''):`<div class="empty-state">Nenhum atendimento marcado para hoje.</div>`;$('#free-list').innerHTML=free.length?free.map(t=>`<span class="slot-chip">${t}</span>`).join(''):`<span class="muted">Sem horários livres.</span>`;wireAppointmentActions()}
    function appointmentRow(a){const c=customerOf(data,a.customerId),s=serviceOf(data,a.serviceId);return `<div class="appointment-row"><div class="time-badge">${a.start}</div><div class="appointment-info"><strong>${c.name}</strong><small>${s.name} • até ${a.end} • ${money(a.price)}</small></div><div class="row-actions"><span class="status ${a.status}">${a.status}</span>${a.status==='agendado'?`<button class="icon-btn" title="Concluir" data-complete="${a.id}">✓</button><button class="icon-btn" title="Cancelar" data-cancel="${a.id}">×</button>`:''}</div></div>`}
    function wireAppointmentActions(){$$('[data-complete]').forEach(b=>b.onclick=()=>{const a=data.appointments.find(x=>x.id===b.dataset.complete);if(a){a.status='concluido';save(data);renderView(active);toast('Atendimento marcado como concluído')}});$$('[data-cancel]').forEach(b=>b.onclick=()=>{const a=data.appointments.find(x=>x.id===b.dataset.cancel);if(a&&confirm('Cancelar este agendamento?')){a.status='cancelado';save(data);renderView(active);toast('Agendamento cancelado')}})}
    function renderAgenda(){const dateInput=$('#agenda-date');if(!dateInput.value)dateInput.value=todayISO();const date=dateInput.value;const items=[...data.appointments.filter(a=>a.date===date&&a.status!=='cancelado').map(a=>({...a,type:'appointment'})),...data.blocks.filter(b=>b.date===date).map(b=>({...b,type:'block'}))].sort((a,b)=>a.start.localeCompare(b.start));$('#agenda-day-label').textContent=dateLabel(date,true);$('#agenda-list').innerHTML=items.length?items.map(x=>x.type==='block'?`<div class="agenda-item blocked"><div class="range">${x.start}</div><div><strong>Horário bloqueado</strong><div class="muted">${x.reason||'Indisponível'} • até ${x.end}</div></div><button class="btn btn-small btn-danger" data-delete-block="${x.id}">Remover</button></div>`:`<div class="agenda-item"><div class="range">${x.start}</div><div><strong>${customerOf(data,x.customerId).name}</strong><div class="muted">${serviceOf(data,x.serviceId).name} • até ${x.end}</div></div><span class="status ${x.status}">${x.status}</span></div>`).join(''):`<div class="empty-state">Nenhum compromisso neste dia.</div>`;dateInput.onchange=()=>renderAgenda();$$('[data-delete-block]').forEach(b=>b.onclick=()=>{data.blocks=data.blocks.filter(x=>x.id!==b.dataset.deleteBlock);save(data);renderAgenda();toast('Bloqueio removido')})}
    function renderNew(){const form=$('#new-form');const service=$('#new-service'),date=$('#new-date'),time=$('#new-time');service.innerHTML=data.services.filter(s=>s.active).map(s=>`<option value="${s.id}">${s.name} — ${money(s.price)} (60 min)</option>`).join('');if(!date.value)date.value=todayISO();const refresh=()=>{const opts=slotsFor(data,date.value,service.value);time.innerHTML=opts.length?opts.map(t=>`<option>${t}</option>`).join(''):`<option value="">Sem horários disponíveis</option>`};service.onchange=refresh;date.onchange=refresh;refresh();form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form);try{data=load();addAppointment(data,{name:String(fd.get('name')).trim(),phone:String(fd.get('phone')).trim(),serviceId:String(fd.get('service')),date:String(fd.get('date')),start:String(fd.get('time'))});form.reset();date.value=todayISO();data=load();refresh();toast('Agendamento criado');setTimeout(()=>switchView('today'),500)}catch(err){toast('Horário indisponível. Atualize e escolha outro.')}}}
    function renderBlock(){const form=$('#block-form');const date=$('#block-date');if(!date.value)date.value=todayISO();form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),start=String(fd.get('start')),end=String(fd.get('end'));if(timeToMin(end)<=timeToMin(start)){toast('O horário final precisa ser depois do inicial.');return}const block={id:uid('b'),date:String(fd.get('date')),start,end,reason:String(fd.get('reason')||'').trim()};const conflict=data.appointments.some(a=>a.date===block.date&&a.status!=='cancelado'&&overlap(timeToMin(block.start),timeToMin(block.end),timeToMin(a.start),timeToMin(a.end)));if(conflict&&!confirm('Esse bloqueio sobrepõe um atendimento já marcado. Criar mesmo assim?'))return;data.blocks.push(block);save(data);form.reset();date.value=todayISO();toast('Horário bloqueado');setTimeout(()=>switchView('agenda'),500)}}
    function renderServices(){const tbody=$('#services-body');tbody.innerHTML=data.services.map(s=>`<tr data-service-row="${s.id}"><td><strong>${s.name}</strong></td><td><input class="table-input" type="number" step="1" min="0" value="${s.price}" data-field="price"></td><td><input class="table-input" type="number" value="60" data-field="duration" disabled></td><td><button class="table-toggle ${s.active?'on':''}" data-toggle-service="${s.id}" aria-label="Ativar ou desativar"></button></td><td><button class="btn btn-small btn-outline" data-save-service="${s.id}">Salvar</button></td></tr>`).join('');$$('[data-toggle-service]').forEach(b=>b.onclick=()=>{const s=data.services.find(x=>x.id===b.dataset.toggleService);s.active=!s.active;save(data);renderServices()});$$('[data-save-service]').forEach(b=>b.onclick=()=>{const row=$(`[data-service-row="${b.dataset.saveService}"]`),s=data.services.find(x=>x.id===b.dataset.saveService);s.price=Number($('[data-field="price"]',row).value);s.duration=60;save(data);toast('Serviço atualizado')})}
    function renderHours(){const names=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];const tbody=$('#hours-body');tbody.innerHTML=Object.entries(data.businessHours).map(([day,h])=>`<tr data-hour-row="${day}"><td><strong>${names[day]}</strong></td><td><button class="table-toggle ${h.active?'on':''}" data-toggle-day="${day}"></button></td><td><input class="table-input" type="time" value="${h.start}" data-hour="start" ${!h.active?'disabled':''}></td><td><input class="table-input" type="time" value="${h.end}" data-hour="end" ${!h.active?'disabled':''}></td><td><button class="btn btn-small btn-outline" data-save-day="${day}" ${!h.active?'disabled':''}>Salvar</button></td></tr>`).join('');$$('[data-toggle-day]').forEach(b=>b.onclick=()=>{const h=data.businessHours[b.dataset.toggleDay];h.active=!h.active;save(data);renderHours()});$$('[data-save-day]').forEach(b=>b.onclick=()=>{const row=$(`[data-hour-row="${b.dataset.saveDay}"]`),h=data.businessHours[b.dataset.saveDay];h.start=$('[data-hour="start"]',row).value;h.end=$('[data-hour="end"]',row).value;if(timeToMin(h.end)<=timeToMin(h.start)){toast('O horário final precisa ser depois do inicial.');return}save(data);toast('Horário atualizado')})}
    function renderClients(){const tbody=$('#clients-body');tbody.innerHTML=data.customers.map(c=>{const aps=data.appointments.filter(a=>a.customerId===c.id&&a.status!=='cancelado').sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start));const last=aps[0];return `<tr><td><div class="client-name">${c.name}</div><div class="client-history">${aps.length} atendimento(s)</div></td><td>${formatPhone(c.phone)}</td><td>${last?`${dateLabel(last.date)} • ${serviceOf(data,last.serviceId).name}`:'—'}</td><td>${money(aps.reduce((sum,a)=>sum+Number(a.price||0),0))}</td></tr>`}).join('')}
    function formatPhone(p){const n=normPhone(p);return n.length===11?`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`:p}
    switchView('today');
  }
})();