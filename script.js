import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, getDoc, setDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD-ah3ZTcZAUpbKtqkCAvzr3J1kciJbZlg",
    authDomain: "sem-flow.firebaseapp.com",
    projectId: "sem-flow",
    storageBucket: "sem-flow.firebasestorage.app",
    messagingSenderId: "275773373096",
    appId: "1:275773373096:web:f7d44209c6159fcbdfa09d",
    measurementId: "G-CF0MTZ10YF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let mode = 'tasks';
let activeCategory = 'Alles'; // Standaard alles tonen
let cloudData = [];
let currentPoints = 0;
let completedOpen = false;

// Lijst met categorieën
const categories = ['Alles', 'Algemeen', 'Ideeën', 'Opschrijven', 'Kopen', 'Werk', 'Privé', 'Overige', 'Later'];

// Initialisatie
async function syncPoints() {
    const docRef = doc(db, 'settings', 'user');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        currentPoints = snap.data().points || 0;
        document.getElementById('pointsDisplay').innerText = currentPoints;
    }
}
syncPoints();

window.setTab = (m) => {
    mode = m;
    document.getElementById('taskBtn').className = `tab-btn ${mode === 'tasks' ? 'active' : ''}`;
    document.getElementById('noteBtn').className = `tab-btn ${mode === 'notes' ? 'active' : ''}`;
    
    // Verberg/toon elementen afhankelijk van tab
    document.getElementById('sort-options').style.display = mode === 'notes' ? 'block' : 'none';
    document.getElementById('prioSelect').style.display = mode === 'tasks' ? 'block' : 'none';
    document.querySelector('.category-scroll-container').style.display = mode === 'tasks' ? 'block' : 'none';
    
    startSync();
};

window.toggleTheme = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('semTheme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
};
if(localStorage.getItem('semTheme') === 'dark') document.body.classList.add('dark-mode');

function startSync() {
    const q = query(collection(db, mode), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        render();
    });
}

// Render Functie (Nu met filtering!)
window.render = () => {
    // 1. Render de categorie balk (Alleen als we in 'tasks' modus zijn)
    if (mode === 'tasks') renderCategoryNav();

    const container = document.getElementById('list-container');
    const completedContainer = document.getElementById('completed-container');
    container.innerHTML = '';
    completedContainer.innerHTML = '';

    let itemsToRender = [...cloudData];

    // Filteren op categorie (behalve als we op 'Alles' staan)
    if (mode === 'tasks' && activeCategory !== 'Alles') {
        itemsToRender = itemsToRender.filter(item => item.cat === activeCategory);
    }

    // Sorteren voor notities
    if (mode === 'notes') {
        const sortVal = document.getElementById('noteSort').value;
        if (sortVal === 'alpha') itemsToRender.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Loop door items en plaats ze
    itemsToRender.forEach((item) => {
        if (item.completed) {
            const cDiv = document.createElement('div');
            cDiv.className = 'completed-item';
            cDiv.innerText = item.text || item.title;
            completedContainer.appendChild(cDiv);
            return;
        }

        const div = document.createElement('div');
        div.className = `taak-kaart prio-${item.prio || 3}`;
        div.id = `kaart-${item.id}`;

        if (mode === 'tasks') {
            div.innerHTML = `
                <div class="kaart-header" onclick="window.toggleKaart('${item.id}')">
                    <div class="header-info">
                        <span class="cat-label">${item.cat || 'Algemeen'}</span>
                        <div class="taak-naam" contenteditable="true" onclick="event.stopPropagation()" onblur="window.saveField('${item.id}', 'text', this.innerText)">${item.text}</div>
                    </div>
                    <div class="expand-arrow">▼</div>
                </div>
                <div class="kaart-body">
                    <div class="body-inner">
                        <div class="format-toolbar">
                            <button class="fmt-btn" onmousedown="event.preventDefault(); document.execCommand('bold')">B</button>
                            <button class="fmt-btn" onmousedown="event.preventDefault(); document.execCommand('italic')">I</button>
                            <button class="fmt-btn" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H3')">H1</button>
                        </div>
                        <div class="taak-notitie" contenteditable="true" onblur="window.saveField('${item.id}', 'note', this.innerHTML)">${item.note || 'Type notitie...'}</div>
                        <div class="action-list">
                            <div class="btn-row" onclick="window.completeTask('${item.id}', '${item.prio}')">✅ Voltooien</div>
                            <div class="btn-row" onclick="window.markLater('${item.id}')">⏳ Later oppakken</div>
                            <div class="btn-row" onclick="window.changeCat('${item.id}')">📁 Verplaatsen</div>
                            <div class="btn-row" onclick="window.changePrio('${item.id}')">🚩 Prio aanpassen</div>
                            <div class="btn-row delete" onclick="window.removeItem('${item.id}')">🗑️ Verwijderen</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Notities render
            div.innerHTML = `<div class="kaart-header"><strong>${item.title}</strong></div>`;
        }
        container.appendChild(div);
    });
    
    updateProgress();
};

function renderCategoryNav() {
    const nav = document.getElementById('categoryNav');
    nav.innerHTML = '';

    // Tel taken per categorie
    const counts = {};
    cloudData.forEach(item => {
        if(!item.completed) {
            const cat = item.cat || 'Algemeen';
            counts[cat] = (counts[cat] || 0) + 1;
            counts['Alles'] = (counts['Alles'] || 0) + 1;
        }
    });

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `nav-pill ${activeCategory === cat ? 'active' : ''}`;
        
        // Alleen badge tonen als er taken zijn
        const count = counts[cat] || 0;
        const badgeHTML = count > 0 ? `<span class="badge">${count}</span>` : '';
        
        btn.innerHTML = `${cat} ${badgeHTML}`;
        btn.onclick = () => {
            activeCategory = cat;
            render();
        };
        nav.appendChild(btn);
    });
}

function updateProgress() {
    // Progress bar update op basis van huidige view
    // (Optioneel: kan ook op basis van alles)
    // Voor nu simpel houden
}

// --- ACTIES ---
window.toggleKaart = (id) => {
    document.getElementById(`kaart-${id}`).classList.toggle('open');
};

window.toggleCompleted = () => {
    completedOpen = !completedOpen;
    document.getElementById('completed-container').classList.toggle('hidden', !completedOpen);
    document.getElementById('completed-arrow').innerText = completedOpen ? '▲' : '▼';
};

window.saveField = async (id, field, value) => {
    await updateDoc(doc(db, mode, id), { [field]: value });
};

window.addItem = async () => {
    const input = document.getElementById('mainInput');
    if (!input.value.trim()) return;
    
    // Automatisch de huidige categorie kiezen (behalve bij 'Alles', dan 'Algemeen')
    let targetCat = activeCategory;
    if (targetCat === 'Alles') targetCat = 'Algemeen';

    const obj = mode === 'tasks' ? {
        text: input.value,
        note: "",
        cat: targetCat, // Hier gebruiken we de slimme categorie
        prio: document.getElementById('prioSelect').value,
        completed: false,
        timestamp: Date.now()
    } : { title: input.value, content: "", timestamp: Date.now() };

    await addDoc(collection(db, mode), obj);
    input.value = '';
};

window.completeTask = async (id, prio) => {
    const points = prio == 1 ? 100 : (prio == 2 ? 90 : 70);
    currentPoints += points;
    
    await updateDoc(doc(db, 'tasks', id), { completed: true });
    await setDoc(doc(db, 'settings', 'user'), { points: currentPoints });
    
    document.getElementById('pointsDisplay').innerText = currentPoints;
    
    const toast = document.getElementById('toast');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
};

window.removeItem = async (id) => {
    if(confirm("Zeker weten?")) await deleteDoc(doc(db, mode, id));
};

window.changeCat = async (id) => {
    const newCat = prompt("Nieuwe categorie:", categories.join(', '));
    // Check of input geldig is, zo ja update
    if (categories.includes(newCat)) await updateDoc(doc(db, 'tasks', id), { cat: newCat });
};

window.changePrio = async (id) => {
    const p = prompt("Prio 1, 2 of 3?");
    if(['1','2','3'].includes(p)) await updateDoc(doc(db, 'tasks', id), { prio: p });
};

window.markLater = async (id) => {
    await updateDoc(doc(db, 'tasks', id), { cat: 'Later' });
    alert("Verplaatst naar 'Later'");
};

startSync();