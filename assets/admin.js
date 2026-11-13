// SANFEST — PANNELLO ORGANIZZATORI
// I dati vengono salvati nel browser. "Esporta JSON" crea la versione pubblicabile.

const map = L.map('map', { zoomControl: false }).setView([45.3062, 9.4939], 16);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors | OpenStreetMap France'
}).addTo(map);

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'sanfest_admin_data';
const EMOJI = { Bar:'🍹', Bancarella:'🛍️', 'Street Food':'🍔', Musica:'🎵', 'Attività':'🎯', Servizi:'ℹ️' };
const TIER_NAMES = { base:'Base', plus:'Plus', premium:'Premium' };
const TIER_NOTES = { base:'Base: mostra fino a 120 caratteri, senza foto.', plus:'Plus: fino a 350 caratteri e 1 foto.', premium:'Premium: descrizione completa, fino a 3 foto, link e maggiore risalto.' };
const markers = new Map();
let editId = null;
let pendingCoords = null;
let placing = false;
let toastTimeout;

function normalizza(p) {
  const cat = Object.hasOwn(EMOJI, p.categoria) ? p.categoria : 'Attività';
  const tier = Object.hasOwn(TIER_NAMES, p.piano) ? p.piano : 'base';
  return {
    id: String(p.id ?? `${Date.now()}-${Math.random().toString(36).slice(2,8)}`),
    nome: String(p.nome ?? '').slice(0,100),
    categoria: cat, piano: tier,
    descrizione: String(p.descrizione ?? '').slice(0,1200),
    orari: String(p.orari ?? '').slice(0,80),
    instagram: String(p.instagram ?? ''), sito: String(p.sito ?? ''),
    foto: Array.isArray(p.foto) ? p.foto.map(String).slice(0,8) : [],
    lat: Number(p.lat), lng: Number(p.lng)
  };
}
function carica() {
  try {
    // Migrazione dei punti dal progetto precedente: non elimina i dati originali.
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('sanfest_punti') ?? '[]';
    const obj = JSON.parse(raw);
    return Array.isArray(obj) ? obj.map(normalizza).filter(p=>p.nome && Number.isFinite(p.lat) && Number.isFinite(p.lng)) : [];
  } catch (e) { console.error('Caricamento fallito:',e); return []; }
}
let punti = carica();
function salva() {
  try {localStorage.setItem(STORAGE_KEY, JSON.stringify(punti));}
  catch(e){alert('Il browser non riesce a salvare i dati. Esporta subito il JSON.');console.error(e);}
}
function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').hidden=true,3500);}
function divIcon(p){return L.divIcon({className:`pin pin-${p.piano}`,html:`<div class="pin-face">${EMOJI[p.categoria]}</div>`,iconSize:[38,38],iconAnchor:[19,19],popupAnchor:[0,-18]});}
function openEditor(p=null, coords=null) {
  editId = p ? p.id : null;
  pendingCoords = coords;
  $('form-attivita').reset();
  $('titolo-modal').textContent = p ? 'Modifica attività' : 'Nuova attività';
  $('campo-nome').value = p?.nome ?? '';
  $('campo-categoria').value = p?.categoria ?? 'Bar';
  $('campo-piano').value = p?.piano ?? 'base';
  $('campo-descrizione').value = p?.descrizione ?? '';
  $('campo-orari').value = p?.orari ?? '';
  $('campo-instagram').value = p?.instagram ?? '';
  $('campo-sito').value = p?.sito ?? '';
  $('campo-foto').value = (p?.foto ?? []).join('\n');
  $('consiglio-piano').textContent=TIER_NOTES[$('campo-piano').value];
  $('modal').hidden=false;
  $('campo-nome').focus();
}
function closeEditor(){$('modal').hidden=true;editId=null;pendingCoords=null;}
function popup(p,m){
  const wrap=document.createElement('div');
  const title=document.createElement('strong');title.className='popup-title';title.textContent=p.nome;
  const meta=document.createElement('div');meta.className='popup-meta';meta.textContent=`${p.categoria} · ${TIER_NAMES[p.piano]}`;
  const actions=document.createElement('div');actions.className='popup-actions';
  const edit=document.createElement('button');edit.type='button';edit.textContent='✏️ Modifica';edit.onclick=()=>openEditor(p);
  const move=document.createElement('button');move.type='button';move.textContent='📍 Sposta';move.onclick=()=>{m.closePopup();m.dragging.enable();m.bindTooltip('Trascina il segnaposto').openTooltip();toast('Trascina il segnaposto nella nuova posizione.');};
  const del=document.createElement('button');del.type='button';del.className='danger';del.textContent='Elimina';del.onclick=()=>{if(!confirm(`Eliminare “${p.nome}”?`))return;punti=punti.filter(x=>x.id!==p.id);salva();render();toast('Attività eliminata.');};
  actions.append(edit,move,del);wrap.append(title,meta,actions);return wrap;
}
function renderMarkers() {
  for(const m of markers.values()) map.removeLayer(m);
  markers.clear();
  for(const p of punti) {
    const m=L.marker([p.lat,p.lng],{icon:divIcon(p),draggable:false}).addTo(map);
    m.bindPopup(popup(p,m),{maxWidth:310});
    m.on('dragend',()=>{
      const ll=m.getLatLng();p.lat=ll.lat;p.lng=ll.lng;
      m.dragging.disable();m.unbindTooltip();salva();toast('Nuova posizione salvata.');
    });
    markers.set(p.id,m);
  }
}
function renderList() {
  const q=$('ricerca-admin').value.trim().toLowerCase();
  const visible=punti.filter(p=>`${p.nome} ${p.categoria}`.toLowerCase().includes(q));
  $('conteggio').textContent=punti.length;
  const list=$('lista-attivita');list.replaceChildren();
  if(!visible.length){const p=document.createElement('p');p.className='empty';p.textContent='Nessuna attività trovata.';list.append(p);return;}
  for(const p of visible){
    const row=document.createElement('button');row.className='activity-item';row.type='button';
    const icon=document.createElement('span');icon.className='activity-icon';icon.textContent=EMOJI[p.categoria];
    const copy=document.createElement('span');copy.className='activity-copy';
    const name=document.createElement('strong');name.textContent=p.nome;
    const cat=document.createElement('small');cat.textContent=p.categoria;copy.append(name,cat);
    const tier=document.createElement('span');tier.className=`tier ${p.piano}`;tier.textContent=TIER_NAMES[p.piano];
    row.append(icon,copy,tier);
    row.onclick=()=>{map.flyTo([p.lat,p.lng], Math.max(map.getZoom(),17));markers.get(p.id)?.openPopup();};
    list.append(row);
  }
}
function render(){renderMarkers();renderList();}

$('btn-aggiungi').onclick=()=>{
  placing=!placing;
  $('btn-aggiungi').textContent=placing?'✕ Annulla inserimento':'＋ Aggiungi attività';
  $('messaggio').textContent=placing?'Ora clicca sulla mappa nella posizione dell’attività.':'Premi “Aggiungi attività”, poi scegli la posizione sulla mappa.';
  map.getContainer().classList.toggle('drag-mode',placing);
};
map.on('click',(e)=>{
  if(!placing)return;
  placing=false;
  $('btn-aggiungi').textContent='＋ Aggiungi attività';
  $('messaggio').textContent='Premi “Aggiungi attività”, poi scegli la posizione sulla mappa.';
  map.getContainer().classList.remove('drag-mode');
  openEditor(null,e.latlng);
});
$('campo-piano').onchange=()=>{$('consiglio-piano').textContent=TIER_NOTES[$('campo-piano').value];};
$('form-attivita').onsubmit=(e)=>{
  e.preventDefault();
  const url=(s)=>/^https?:\/\//i.test(s)?s:'';
  const values={
    nome:$('campo-nome').value.trim(), categoria:$('campo-categoria').value,piano:$('campo-piano').value,
    descrizione:$('campo-descrizione').value.trim(),orari:$('campo-orari').value.trim(),
    instagram:url($('campo-instagram').value.trim()),sito:url($('campo-sito').value.trim()),
    foto:$('campo-foto').value.split(/\r?\n/).map(s=>s.trim()).filter(s=>s.startsWith('images/')||/^https:\/\//i.test(s)).slice(0,8)
  };
  if(!values.nome)return;
  if(editId){const p=punti.find(x=>x.id===editId);if(!p){alert('Attività non trovata.');return;}Object.assign(p,values);}
  else {if(!pendingCoords){alert('Devi scegliere una posizione sulla mappa.');return;}
    punti.push({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,...values,lat:pendingCoords.lat,lng:pendingCoords.lng});}
  salva();closeEditor();render();toast('Attività salvata.');
};
$('chiudi-modal').onclick=closeEditor;$('annulla-modal').onclick=closeEditor;
$('modal').onclick=(e)=>{if(e.target===$('modal'))closeEditor();};
document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&!$('modal').hidden)closeEditor();});
$('ricerca-admin').oninput=renderList;
$('btn-esporta').onclick=()=>{
  const blob=new Blob([JSON.stringify(punti,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='attivita.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('JSON esportato. Sostituisci data/attivita.json per aggiornare il sito pubblico.');
};
$('btn-importa').onclick=()=>$('file-importa').click();
$('file-importa').onchange=async (e)=>{
  const f=e.target.files?.[0];if(!f)return;
  try{
    const parsed=JSON.parse(await f.text());if(!Array.isArray(parsed))throw new Error('Atteso un elenco JSON.');
    const next=parsed.map(normalizza).filter(p=>p.nome&&Number.isFinite(p.lat)&&Number.isFinite(p.lng));
    if(!confirm(`Importare ${next.length} attività? Sostituirà la bozza nel browser.`))return;
    punti=next;salva();render();toast('Importazione completata.');
  }catch(err){alert('Il file JSON non è valido: '+err.message);}finally{e.target.value='';}
};
render();
