// SANFEST — MAPPA PER I VISITATORI
// In pubblico legge data/attivita.json; ?anteprima=1 mostra la bozza locale dell'organizzatore.

const EMOJI = {Bar:'🍹',Bancarella:'🛍️','Street Food':'🍔',Musica:'🎵','Attività':'🎯',Servizi:'ℹ️'};
const ORDER = {premium:0,plus:1,base:2};
const $ = (id) => document.getElementById(id);
const map = L.map('map',{zoomControl:false}).setView([45.3062,9.4939],16);
L.control.zoom({position:'bottomright'}).addTo(map);
const tiles = L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',{
  maxZoom:19,attribution:'&copy; OpenStreetMap contributors | OpenStreetMap France'
}).addTo(map);
let errors=0;
tiles.on('tileerror',()=>{errors++;if(errors>=4)$('errore').hidden=false;});
tiles.on('load',()=>{errors=0;$('errore').hidden=true;});
const markers=new Map();
let data=[],category='Tutti',search='',selected=null;

const validUrl=(s)=>typeof s==='string'&&/^https?:\/\//i.test(s)?s:null;
const validImage=(s)=>typeof s==='string'&&(s.startsWith('images/')||/^https:\/\//i.test(s))?s:null;
function normalize(p){
  const lat=Number(p.lat),lng=Number(p.lng);
  if(!p.nome||!Number.isFinite(lat)||!Number.isFinite(lng))return null;
  return {
    id:String(p.id??p.nome),nome:String(p.nome),categoria:EMOJI[p.categoria]?p.categoria:'Attività',
    piano:['base','plus','premium'].includes(p.piano)?p.piano:'base',
    descrizione:String(p.descrizione??''),orari:String(p.orari??''),
    instagram:validUrl(p.instagram),sito:validUrl(p.sito),
    foto:Array.isArray(p.foto)?p.foto.map(validImage).filter(Boolean):[],
    lat,lng
  };
}
function descriptions(p){const max=p.piano==='base'?120:p.piano==='plus'?350:1200;return p.descrizione.length>max?p.descrizione.slice(0,max).trimEnd()+'…':p.descrizione;}
function photos(p){return p.piano==='premium'?p.foto.slice(0,3):p.piano==='plus'?p.foto.slice(0,1):[];}
function matches(p){return (category==='Tutti'||p.categoria===category)&&`${p.nome} ${p.categoria} ${p.descrizione}`.toLowerCase().includes(search);}
function sorted(){return data.filter(matches).sort((a,b)=>(ORDER[a.piano]-ORDER[b.piano])||a.nome.localeCompare(b.nome,'it'));}
function elem(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function renderFilters(){const wrap=$('filtri');wrap.replaceChildren();for(const c of ['Tutti',...Object.keys(EMOJI)]){const b=elem('button',`filter ${category===c?'active':''}`,c);b.type='button';b.onclick=()=>{category=c;render();};wrap.append(b);}}
function renderMarkers(){for(const marker of markers.values())map.removeLayer(marker);markers.clear();
  for(const p of sorted()){
    const ico=L.divIcon({className:`pin pin-${p.piano}`,html:`<div class="pin-face">${EMOJI[p.categoria]}</div>`,iconSize:[38,38],iconAnchor:[19,19]});
    const marker=L.marker([p.lat,p.lng],{icon:ico}).addTo(map);
    marker.on('click',()=>selectPoint(p.id,false));
    marker.bindTooltip(p.nome,{direction:'top',offset:[0,-15]});
    markers.set(p.id,marker);
  }
}
function renderList(){const arr=sorted(),wrap=$('lista');wrap.replaceChildren();$('conteggio').textContent=`${arr.length} attività`;
  if(arr.length===0){wrap.append(elem('div','empty','Nessuna attività trovata. Prova un altro filtro.'));return;}
  for(const p of arr){
    const b=elem('button',`result ${p.piano==='premium'?'premium':''}`);b.type='button';
    const icon=elem('div','result-icon',EMOJI[p.categoria]);
    const copy=elem('div','result-text');copy.append(elem('strong','',p.nome),elem('small','',p.categoria));
    b.append(icon,copy);
    if(p.piano==='premium')b.append(elem('span','result-tag','In evidenza'));
    b.onclick=()=>selectPoint(p.id,true);
    wrap.append(b);
  }
}
function selectPoint(id,fly){const p=data.find(x=>x.id===id);if(!p)return;selected=id;
  if(fly)map.flyTo([p.lat,p.lng],Math.max(map.getZoom(),17),{duration:.5});
  const panel=$('scheda');panel.replaceChildren();panel.hidden=false;
  const top=elem('div','detail-top'),txt=elem('div');
  const tag=p.piano==='premium'?'⭐ Partner in evidenza · promozione':p.piano==='plus'?'Scheda Plus':p.categoria;
  txt.append(elem('small','',tag),elem('h2','',`${EMOJI[p.categoria]} ${p.nome}`));
  const close=elem('button','close-detail','✕');close.type='button';close.setAttribute('aria-label','Chiudi dettagli');close.onclick=()=>{panel.hidden=true;selected=null;};
  top.append(txt,close);panel.append(top);
  const images=photos(p);
  if(images.length){
    const large=elem('img','detail-photo');large.alt=`Foto di ${p.nome}`;large.src=images[0];large.onerror=()=>{large.style.display='none';};panel.append(large);
    if(images.length>1){const thumbs=elem('div','detail-thumbnails');for(const [i,url] of images.entries()){
      const t=elem('img',`thumb ${i===0?'active':''}`);t.src=url;t.alt=`Foto ${i+1} di ${p.nome}`;t.onerror=()=>t.remove();
      t.onclick=()=>{large.src=url;large.style.display='';for(const im of thumbs.children)im.classList.remove('active');t.classList.add('active');};
      thumbs.append(t);
    }panel.append(thumbs);}
  }
  if(p.descrizione)panel.append(elem('p','detail-description',descriptions(p)));
  if(p.orari)panel.append(elem('div','detail-meta',`🕒 ${p.orari}`));
  const actions=elem('div','detail-actions');
  const nav=elem('a','primary','↗ Indicazioni');
  nav.href=`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`;
  nav.target='_blank';nav.rel='noopener noreferrer';actions.append(nav);
  if(p.piano==='premium'){
    if(p.instagram){const a=elem('a','','Instagram');a.href=p.instagram;a.target='_blank';a.rel='noopener noreferrer';actions.append(a);}
    if(p.sito){const a=elem('a','','Sito web');a.href=p.sito;a.target='_blank';a.rel='noopener noreferrer';actions.append(a);}
  }
  panel.append(actions);
}
function render(){renderFilters();renderMarkers();renderList();if(selected&&!sorted().some(p=>p.id===selected)){$('scheda').hidden=true;selected=null;}}
$('ricerca').oninput=(e)=>{search=e.target.value.trim().toLowerCase();render();};

async function load(){
  const preview=new URLSearchParams(location.search).get('anteprima')==='1';
  try{
    let raw;
    if(preview){raw=JSON.parse(localStorage.getItem('sanfest_admin_data')??localStorage.getItem('sanfest_punti')??'[]');}
    else {const resp=await fetch('data/attivita.json',{cache:'no-store'});if(!resp.ok)throw new Error(`HTTP ${resp.status}`);raw=await resp.json();}
    if(!Array.isArray(raw))throw new Error('Formato JSON non valido');
    data=raw.map(normalize).filter(Boolean);render();
  }catch(err){console.error('Errore dati:',err);$('lista').replaceChildren(elem('div','empty','Impossibile leggere le attività. Avvia il sito con Live Server e verifica data/attivita.json.'));}
}
render();load();

// POSIZIONAMENTO AUTOMATICO ELENCO ATTIVITÀ

const pannelloSuperiore = document.querySelector(".visitor-top");
const pannelloRisultati = document.querySelector(".results-panel");

if (pannelloSuperiore && pannelloRisultati) {

    function aggiornaPosizioneRisultati() {

        // Troviamo il bordo inferiore del pannello superiore
        const posizione = pannelloSuperiore.getBoundingClientRect();

        // Lasciamo 8px di spazio tra i pannelli
        const nuovaPosizione = Math.ceil(posizione.bottom + 8);

        document.documentElement.style.setProperty(
            "--results-top",
            nuovaPosizione + "px"
        );
    }

    // Aggiorniamo quando cambiano le dimensioni
    const observer = new ResizeObserver(aggiornaPosizioneRisultati);

    observer.observe(pannelloSuperiore);

    window.addEventListener("resize", aggiornaPosizioneRisultati);

    aggiornaPosizioneRisultati();
}
