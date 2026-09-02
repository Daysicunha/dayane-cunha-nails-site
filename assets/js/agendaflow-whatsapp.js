(function(){
  if(document.body.dataset.page!=='booking') return;

  const selected={serviceId:null,date:null,start:null};
  const KEY='agendaflow-one-preview-v1';

  document.addEventListener('click',(event)=>{
    const service=event.target.closest('[data-service]');
    const date=event.target.closest('[data-date]');
    const time=event.target.closest('[data-time]');
    if(service) selected.serviceId=service.dataset.service;
    if(date) selected.date=date.dataset.date;
    if(time) selected.start=time.dataset.time;
  },true);

  function statusMessage(kind){
    const card=document.querySelector('.success-card');
    if(!card) return;
    let box=card.querySelector('[data-whatsapp-status]');
    if(!box){
      box=document.createElement('div');
      box.dataset.whatsappStatus='true';
      box.style.margin='18px auto';
      box.style.padding='14px 16px';
      box.style.borderRadius='12px';
      box.style.maxWidth='520px';
      box.style.background='rgba(150,0,24,.06)';
      box.style.fontSize='.9rem';
      card.querySelector('.success-details')?.after(box);
    }
    if(kind==='sent') box.innerHTML='✅ <strong>Confirmação enviada pelo WhatsApp.</strong><br><span class="muted">Você também receberá um lembrete aproximadamente 1 dia antes do atendimento.</span>';
    if(kind==='pending') box.innerHTML='💬 <strong>Seu agendamento foi registrado.</strong><br><span class="muted">A confirmação automática por WhatsApp está aguardando a ativação da integração nesta prévia.</span>';
    if(kind==='conflict') box.innerHTML='⚠️ <strong>Esse horário acabou de ficar indisponível.</strong><br><span class="muted">Volte e escolha outro horário para concluir o agendamento.</span>';
  }

  function removeLocalBooking(payload){
    try{
      const data=JSON.parse(localStorage.getItem(KEY));
      if(!data?.appointments) return;
      const customer=data.customers?.find(c=>String(c.phone||'').replace(/\D/g,'')===String(payload.phone||'').replace(/\D/g,''));
      data.appointments=data.appointments.filter(a=>!(customer&&a.customerId===customer.id&&a.serviceId===payload.serviceId&&a.date===payload.date&&a.start===payload.start));
      localStorage.setItem(KEY,JSON.stringify(data));
    }catch(e){}
  }

  document.addEventListener('submit',(event)=>{
    if(event.target.id!=='booking-form') return;
    const fd=new FormData(event.target);
    const payload={
      name:String(fd.get('name')||'').trim(),
      phone:String(fd.get('phone')||'').trim(),
      serviceId:selected.serviceId,
      date:selected.date,
      start:selected.start
    };
    if(!payload.serviceId||!payload.date||!payload.start) return;

    setTimeout(async()=>{
      try{
        const response=await fetch('/api/book',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(payload)
        });
        const result=await response.json().catch(()=>({}));
        if(response.status===409){removeLocalBooking(payload);statusMessage('conflict');return;}
        if(response.status===503&&result.error==='backend_not_configured'){statusMessage('pending');return;}
        if(!response.ok){statusMessage('pending');return;}
        statusMessage(result.whatsapp?.sent?'sent':'pending');
      }catch(error){statusMessage('pending');}
    },0);
  });
})();
