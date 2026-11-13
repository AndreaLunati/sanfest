
/* ======================================
   1. CREAZIONE DELLA MAPPA
====================================== */

const latitudine = 45.3062;
const longitudine = 9.4939;

const map = L.map("map", {
    zoomControl: false
}).setView(
    [latitudine, longitudine],
    16
);

L.control.zoom({
    position: "bottomright"
}).addTo(map);

// Cartografia
L.tileLayer(
    "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors | OpenStreetMap France'
    }
).addTo(map);


/* ======================================
   2. CATEGORIE E ICONE
====================================== */

const icone = {
    "Bar": "🍹",
    "Bancarella": "🛍️",
    "Street Food": "🍔",
    "Musica": "🎵",
    "Attività": "🎯",
    "Servizi": "ℹ️"
};


/* ======================================
   3. RECUPERO ATTIVITÀ SALVATE
====================================== */

let punti = [];

try {

    const salvati = JSON.parse(
        localStorage.getItem("sanfest_punti") || "[]"
    );

    if (Array.isArray(salvati)) {

        punti = salvati.map((p, indice) => ({
            ...p,
            id: String(p.id ?? `vecchio-${indice}`)
        }));

    }

} catch (errore) {
    console.error("Errore caricamento:", errore);
}

// Salva tutte le attività
function salvaPunti() {
    localStorage.setItem(
        "sanfest_punti",
        JSON.stringify(punti)
    );
}


/* ======================================
   4. ELEMENTI HTML
====================================== */

const pulsanteAggiungi =
    document.getElementById("aggiungi-punto");

const selettoreCategoria =
    document.getElementById("categoria");

const modal =
    document.getElementById("modal-attivita");

const form =
    document.getElementById("form-attivita");

const titoloModal =
    document.getElementById("titolo-modal");

const inputNome =
    document.getElementById("nome-attivita");

const inputCategoria =
    document.getElementById("categoria-attivita");

const inputDescrizione =
    document.getElementById("descrizione-attivita");

const inputOrari =
    document.getElementById("orari-attivita");

const pulsanteAnnulla =
    document.getElementById("annulla-attivita");

let inserimentoAttivo = false;
let posizioneNuovoPunto = null;
let idInModifica = null;

// Conserviamo i riferimenti ai marker Leaflet
const markers = new Map();


/* ======================================
   5. CREAZIONE ICONE
====================================== */

function creaIcona(categoria) {

    return L.divIcon({
        className: "icona-attivita",
        html: icone[categoria] || "📍",
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });

}


/* ======================================
   6. SCHEDA ATTIVITÀ
====================================== */

function creaScheda(punto, marker) {

    const scheda = document.createElement("div");
    scheda.className = "scheda-attivita";

    // Categoria
    const categoria = document.createElement("div");
    categoria.className = "scheda-categoria";

    categoria.textContent =
        `${icone[punto.categoria] || "📍"} ${punto.categoria}`;

    // Nome
    const nome = document.createElement("h3");
    nome.textContent = punto.nome;

    scheda.append(categoria, nome);

    // Descrizione
    if (punto.descrizione) {

        const descrizione = document.createElement("p");
        descrizione.textContent = punto.descrizione;

        scheda.append(descrizione);
    }

    // Orari
    if (punto.orari) {

        const orari = document.createElement("p");
        orari.textContent = `🕒 ${punto.orari}`;

        scheda.append(orari);
    }

    // Contenitore dei pulsanti
    const azioni = document.createElement("div");
    azioni.className = "azioni-scheda";

    // MODIFICA
    const modifica = document.createElement("button");
    modifica.textContent = "✏️ Modifica";

    modifica.addEventListener("click", () => {
        apriModal(punto);
    });

    // SPOSTA
    const sposta = document.createElement("button");
    sposta.textContent = "📍 Sposta";

    sposta.addEventListener("click", () => {

        marker.closePopup();

        // Abilitiamo il trascinamento
        marker.dragging.enable();

        marker.bindTooltip(
            "Trascinami nella nuova posizione",
            { direction: "top" }
        ).openTooltip();

    });

    // ELIMINA
    const elimina = document.createElement("button");

    elimina.textContent = "🗑️ Elimina";
    elimina.className = "azione-pericolo";

    elimina.addEventListener("click", () => {

        const conferma = confirm(
            `Eliminare ${punto.nome}?`
        );

        if (!conferma) return;

        // Rimuoviamo il punto dai dati
        punti = punti.filter(p => p.id !== punto.id);

        // Rimuoviamo il marker dalla mappa
        map.removeLayer(marker);

        markers.delete(punto.id);

        // Aggiorniamo il salvataggio
        salvaPunti();

    });

    azioni.append(modifica, sposta, elimina);
    scheda.append(azioni);

    return scheda;
}


/* ======================================
   7. MOSTRIAMO I PUNTI
====================================== */

function mostraPunto(punto) {

    const marker = L.marker(
        [punto.lat, punto.lng],
        {
            icon: creaIcona(punto.categoria),
            draggable: false
        }
    ).addTo(map);

    // Popup
    marker.bindPopup(
        creaScheda(punto, marker),
        { maxWidth: 300 }
    );

    // Quando terminiamo lo spostamento
    marker.on("dragend", () => {

        const nuovaPosizione = marker.getLatLng();

        punto.lat = nuovaPosizione.lat;
        punto.lng = nuovaPosizione.lng;

        salvaPunti();

        // Disattiviamo il trascinamento
        marker.dragging.disable();
        marker.unbindTooltip();

        marker.openPopup();

    });

    markers.set(punto.id, marker);

    return marker;
}

// Mostriamo i punti salvati
punti.forEach(mostraPunto);


/* ======================================
   8. APERTURA MODALE
====================================== */

function apriModal(punto = null) {

    form.reset();

    // Stiamo modificando o aggiungendo?
    idInModifica = punto ? punto.id : null;

    titoloModal.textContent = punto
        ? "Modifica attività"
        : "Nuova attività";

    // Precompiliamo i campi
    inputNome.value = punto?.nome || "";

    inputCategoria.value = punto?.categoria ||
        selettoreCategoria.value;

    inputDescrizione.value =
        punto?.descrizione || "";

    inputOrari.value =
        punto?.orari || "";

    modal.hidden = false;
    inputNome.focus();
}

function chiudiModal() {

    modal.hidden = true;

    posizioneNuovoPunto = null;
    idInModifica = null;
}

// Pulsante Annulla
pulsanteAnnulla.addEventListener(
    "click",
    chiudiModal
);

// Chiusura cliccando fuori dalla finestra
modal.addEventListener("click", (evento) => {

    if (evento.target === modal) {
        chiudiModal();
    }

});

// Chiusura con ESC
document.addEventListener("keydown", (evento) => {

    if (evento.key === "Escape" && !modal.hidden) {
        chiudiModal();
    }

});


/* ======================================
   9. AGGIUNTA NUOVO PUNTO
====================================== */

pulsanteAggiungi.addEventListener("click", () => {

    inserimentoAttivo = !inserimentoAttivo;

    pulsanteAggiungi.textContent = inserimentoAttivo
        ? "Annulla inserimento"
        : "+ Aggiungi punto";

    map.getContainer().style.cursor =
        inserimentoAttivo ? "crosshair" : "";

});

// Clic sulla mappa
map.on("click", (evento) => {

    if (!inserimentoAttivo) return;

    // Salviamo la posizione scelta
    posizioneNuovoPunto = evento.latlng;

    inserimentoAttivo = false;

    pulsanteAggiungi.textContent = "+ Aggiungi punto";

    map.getContainer().style.cursor = "";

    // Apriamo il modulo
    apriModal();

});


/* ======================================
   10. SALVATAGGIO ATTIVITÀ
====================================== */

form.addEventListener("submit", (evento) => {

    evento.preventDefault();

    const nome = inputNome.value.trim();

    if (!nome) return;

    // Recuperiamo i dati del modulo
    const dati = {
        nome: nome,
        categoria: inputCategoria.value,
        descrizione: inputDescrizione.value.trim(),
        orari: inputOrari.value.trim()
    };

    // MODIFICA ATTIVITÀ ESISTENTE
    if (idInModifica !== null) {

        const punto = punti.find(
            p => p.id === idInModifica
        );

        if (!punto) return;

        // Aggiorniamo i dati
        Object.assign(punto, dati);

        const marker = markers.get(punto.id);

        // Aggiorniamo icona e popup
        marker.setIcon(creaIcona(punto.categoria));

        marker.setPopupContent(
            creaScheda(punto, marker)
        );

        marker.openPopup();

    } else {

        // NUOVA ATTIVITÀ
        if (!posizioneNuovoPunto) return;

        const nuovoPunto = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            ...dati,
            lat: posizioneNuovoPunto.lat,
            lng: posizioneNuovoPunto.lng
        };

        punti.push(nuovoPunto);

        // Mostriamo subito il marker
        const marker = mostraPunto(nuovoPunto);

        marker.openPopup();
    }

    // Salviamo nel browser
    salvaPunti();

    // Chiudiamo la finestra
    chiudiModal();

});
