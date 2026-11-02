let socialToken='';
function socialHeaders(extra={}){return {...extra,...(socialToken?{Authorization:'Bearer '+socialToken}:{})}}
async function api(path){const r=await fetch('/api/social'+path,{headers:socialHeaders(),cache:'no-store'});if(!r.ok)throw new Error('Social API '+r.status+': '+await r.text());return r.json()}
function requireUnlocked(){if(!socialToken)throw new Error('Unlock the social control plane first')}
async function unlockSocial(){
  const input=document.getElementById('social-token');
  socialToken=input.value.trim();
  input.value='';
  const status=document.getElementById('social-auth-status');
  if(!socialToken){status.textContent='Enter a social control token.';return}
  try{await load();status.textContent='Unlocked for this page session. Token is not stored.'}
  catch(e){socialToken='';status.textContent='Unlock failed: '+e.message}
}
async function startOAuth(network){
  requireUnlocked();
  const r=await fetch('/api/social/oauth/'+encodeURIComponent(network)+'/connect',{headers:socialHeaders(),cache:'no-store'});
  if(!r.ok)throw new Error('OAuth start '+r.status+': '+await r.text());
  const body=await r.json();
  const destination=new URL(body.url);
  if(destination.protocol!=='https:')throw new Error('OAuth provider URL must use HTTPS');
  location.assign(destination.href);
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function networkCard(n){const ready=n.clientIdConfigured&&n.clientSecretConfigured;return '<article class="card"><div class="eyebrow">'+esc(n.network.toUpperCase())+'</div><strong>'+ (ready?'OAUTH READY':'NEEDS APP KEYS') +'</strong><span class="pill '+(ready?'ready':'blocked')+'">'+(ready?'CONFIGURED':'BLOCKED')+'</span></article>'}
function metric(label,value){return '<div class="metric"><span class="muted">'+esc(label)+'</span><b>'+esc(value)+'</b></div>'}
const metricLabels={holdRate:'Hold rate',completionRate:'Completion rate',rewatchRate:'Rewatch rate',shareRate:'Share rate',saveRate:'Save rate',commentRate:'Comment rate',followRate:'Follow rate',clickRate:'Click rate',revenueRate:'Revenue rate'};
async function saveWeights(){
  requireUnlocked();
  const weights={};
  document.querySelectorAll('[data-weight]').forEach(input=>{weights[input.dataset.weight]=Number(input.value)||0});
  const r=await fetch('/api/social/metrics/config',{method:'PUT',headers:socialHeaders({'content-type':'application/json'}),body:JSON.stringify({weights})});
  if(!r.ok) throw new Error(await r.text());
  await load();
}
function showConnectedBanner(){
  const p=new URLSearchParams(location.search); const n=p.get('connected');
  if(n&&['instagram','youtube','x','linkedin','reddit'].includes(n.toLowerCase())){document.querySelector('.hero p').textContent='OAuth callback returned for '+n.toUpperCase()+'. Unlock and verify account status; a redirect alone is not proof of connection.';}
}
async function load(){
  requireUnlocked();
  const [status,accounts,posts,metricConfig,metrics]=await Promise.all([api('/status'),api('/accounts'),api('/posts'),api('/metrics/config'),api('/metrics')]);
  document.getElementById('network-grid').innerHTML=status.networks.map(networkCard).join('');
  document.getElementById('metrics').innerHTML=[
    metric('Accounts',status.counts.accounts),metric('Queued',status.counts.queued),metric('Scheduled',status.counts.scheduled),metric('Published',status.counts.published),metric('Failed',status.counts.failed)
  ].join('');
  document.getElementById('weights').innerHTML=Object.entries(metricConfig.weights).map(([k,v])=>'<div class="weight"><label>'+esc(metricLabels[k]||k)+'</label><input type="number" min="0" step="0.01" value="'+esc(v)+'" data-weight="'+esc(k)+'"></div>').join('');
  const latest=metrics.slice(-50);
  const avg=latest.length?latest.reduce((s,m)=>s+Number(m.evaluation?.score||0),0)/latest.length:0;
  const bands=latest.reduce((a,m)=>{const d=m.evaluation?.decision||'unknown';a[d]=(a[d]||0)+1;return a},{});
  document.getElementById('growth-summary').innerHTML=[
    metric('Measured posts',latest.length),
    metric('Avg Savage score',avg.toFixed(1)),
    metric('Scale',bands.scale||0),
    metric('Iterate',bands.iterate||0),
    metric('Test',bands.test||0),
    metric('Cut',bands.cut||0)
  ].join('');
  document.getElementById('accounts').innerHTML=accounts.length?accounts.map(a=>'<div class="row"><b>'+esc(a.network.toUpperCase())+'</b><span>'+esc(a.label)+'</span><span>'+esc(a.handle||'handle pending')+'</span><span class="pill blocked">'+esc(a.connectionStatus)+'</span></div>').join(''):'<p class="muted">No social accounts registered yet.</p>';
  document.getElementById('queue').innerHTML=posts.length?posts.slice(0,50).map(p=>'<div class="row"><b>'+esc(p.networks.join(', ').toUpperCase())+'</b><span>'+esc(p.title)+'</span><span>'+esc(p.scheduledFor||'unscheduled')+'</span><span class="pill">'+esc(p.status)+'</span></div>').join(''):'<p class="muted">Queue empty. Import the Video Studio first wave.</p>';
}
document.getElementById('social-unlock').addEventListener('click',unlockSocial);
document.getElementById('social-token').addEventListener('keydown',e=>{if(e.key==='Enter')unlockSocial()});
document.getElementById('refresh-btn').addEventListener('click',()=>load().catch(e=>{document.getElementById('social-auth-status').textContent=e.message}));
document.querySelectorAll('[data-oauth-network]').forEach(button=>button.addEventListener('click',()=>startOAuth(button.dataset.oauthNetwork).catch(e=>{document.getElementById('social-auth-status').textContent=e.message})));

document.getElementById('save-weights-btn').addEventListener('click',()=>saveWeights().catch(e=>alert(e.message)));

showConnectedBanner();
