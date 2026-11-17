/* Fix: keep AgentH V2 sidebar mounted when connecting WhatsApp. */
function v2OpenWhatsAppConnector(){
  if(!data.agents?.length)return;
  if(modal){modal='';render()}
  let host=document.getElementById('v2WhatsAppHost');
  if(host)return;
  const side=document.querySelector('.side');
  const width=side?.getBoundingClientRect()?.right||320;
  host=document.createElement('section');
  host.id='v2WhatsAppHost';
  host.style.setProperty('--v2-wa-sidebar',Math.max(0,Math.round(width))+'px');
  host.setAttribute('aria-label','WhatsApp connection panel');
  host.innerHTML='<div class="v2WhatsAppFrame">'+
    '<div class="v2WhatsAppFrameTop"><strong>WhatsApp</strong>'+ 
    '<button type="button" onclick="v2CloseWhatsAppConnector()" aria-label="Close WhatsApp connector">Close ✕</button></div>'+
    '<iframe title="WhatsApp connector" src="/dashboard/whatsapp-connect" referrerpolicy="same-origin"></iframe>'+
    '</div>';
  document.body.appendChild(host);
}
function v2CloseWhatsAppConnector(refresh=true){
  const host=document.getElementById('v2WhatsAppHost');
  if(host)host.remove();
  if(refresh){
    void Promise.allSettled([v2LoadConnections(),v2LoadAgents()]).then(()=>render());
  }
}
const v2WhatsAppPreviousConnectorClick=connectorClick;
connectorClick=async function(name){
  if(name==='WhatsApp'){v2OpenWhatsAppConnector();return}
  return v2WhatsAppPreviousConnectorClick(name);
};
const v2WhatsAppPreviousSelectAgent=selectAgent;
selectAgent=async function(id){
  v2CloseWhatsAppConnector(false);
  return v2WhatsAppPreviousSelectAgent(id);
};
const v2WhatsAppPreviousRender=render;
render=function(){
  v2WhatsAppPreviousRender();
  const contactLink=document.querySelector('.connectorLink');
  if(contactLink){
    contactLink.onclick=v2OpenWhatsAppConnector;
    contactLink.setAttribute('role','button');
    contactLink.setAttribute('tabindex','0');
    contactLink.setAttribute('aria-label','Open WhatsApp connector and contacts');
    contactLink.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();v2OpenWhatsAppConnector()}};
  }
};

/*
 * IMPORTANT: WhatsApp Manager uses the real dedicated task/contacts/approval
 * backend, never the ordinary model-only /api/conversations route.
 * Keep AgentH V2 left rail intact and mount the authenticated React workspace
 * in the right chat pane.
 */
const v2WAOriginalChatHTML=chatHTML;
chatHTML=function(agent){
  if(agent?.name==='WhatsApp Manager'){
    return '<div class="v2WAConnectedChat"><iframe class="v2WAConnectedChatFrame" title="WhatsApp Manager live chat" src="/dashboard/whatsapp-connect?view=agent&amp;embed=chat" allow="microphone"></iframe></div>';
  }
  return v2WAOriginalChatHTML(agent);
};
