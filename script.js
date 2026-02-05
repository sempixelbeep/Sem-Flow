import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD-ah3ZTcZAUpbKtqkCAvzr3J1kciJbZlg",
    authDomain: "sem-flow.firebaseapp.com",
    projectId: "sem-flow",
    storageBucket: "sem-flow.firebasestorage.app",
    messagingSenderId: "275773373096",
    appId: "1:275773373096:web:f7d44209c6159fcbdfa09d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let activeCategory = 'Alles';
let cloudData = [];
const taskCategories = ['Alles', 'Algemeen', 'Ideeën', 'Opschrijven', 'Kopen', 'Werk', 'Privé', 'Overige', 'Later'];
const allTabs = [...taskCategories, 'Notitieblok'];

window.onload = () => {
    fillCategoryDropdown();
    startSync();
};

function fillCategoryDropdown() {
    const sel = document.getElementById('catSelect');
    if(!sel) return;
    sel.innerHTML = '';
    taskCategories.filter(c => c !== 'Alles').forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        sel.appendChild(opt);
    });
}

function startSync() {
    const collectionName = activeCategory === 'Notitieblok' ? 'notes' : 'tasks';
    const q = query(collection(db, collectionName), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        render();
    });
}

window.render = () => {
    renderCategoryNav();
    const container = document.getElementById('list-container');
    const compContainer = document.getElementById('completed-container');
    if(!container) return;

    container.innerHTML = '';
    compContainer.innerHTML = '';

    cloudData.forEach(item => {
        // Filter logica
        if (activeCategory !== 'Alles' && activeCategory !== 'Notitieblok' && item.cat !== activeCategory) return;

        // Maak de taakkaart container
        const div = document.createElement('div');
        
        // --- 1. NOTITIEBLOK MODUS ---
        if (activeCategory === 'Notitieblok') {
            div.className = 'taak-kaart';
            div.innerHTML = `
                <div class="kaart-header" onclick="this.parentElement.classList.toggle('open')">
                    <div class="taak-naam" contenteditable="true" onblur="window.saveField('${item.id}', 'text', this.innerText)">${item.text}</div>
                </div>
                <div class="kaart-body">
                   <div class="actions"><button class="btn-row delete" onclick="window.deleteItem('${item.id}')">🗑️ Verwijderen</button></div>
                </div>`;
            container.appendChild(div);
            return;
        }

        // --- 2. TAAK MODUS ---
        // Bepaal classes: voltooid krijgt extra class 'completed', anders gewoon prio-kleur
        div.className = `taak-kaart prio-${item.prio || 2} ${item.completed ? 'completed' : ''}`;
        
        // De HTML inhoud van de kaart (zowel voor actief als voltooid bijna hetzelfde)
        // Let op: contenteditable staat aan, klik op titel = typen.
        // Klik op header (behalve titel) = openklappen.
        div.innerHTML = `
            <div class="kaart-header" onclick="window.toggleCard(event, this)">
                <div class="header-info">
                    <span class="cat-label">${item.cat}</span>
                    <div class="taak-naam" contenteditable="true" onclick="event.stopPropagation()" onblur="window.saveField('${item.id}', 'text', this.innerText)">${item.text}</div>
                </div>
                <div class="expand-arrow">▼</div>
            </div>
            <div class="kaart-body">
                <textarea onblur="window.saveField('${item.id}', 'note', this.value)" placeholder="Notitie...">${item.note || ''}</textarea>
                <div class="actions">
                    ${!item.completed ? 
                        `<button class="btn-row" onclick="window.completeTask('${item.id}')">✅ Voltooien</button>` : 
                        `<button class="btn-row restore" onclick="window.undoComplete('${item.id}')">♻️ Terugzetten</button>`
                    }
                    <button class="btn-row delete" onclick="window.deleteItem('${item.id}')">🗑️ Wis</button>
                </div>
            </div>`;

        // Plaats in juiste bakje
        if (item.completed) {
            compContainer.appendChild(div);
        } else {
            container.appendChild(div);
        }
    });
};

function renderCategoryNav() {
    const nav = document.getElementById('categoryNav');
    if(!nav) return;
    nav.innerHTML = '';
    allTabs.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `nav-pill ${activeCategory === cat ? 'active' : ''} ${cat === 'Notitieblok' ? 'special' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => {
            activeCategory = cat;
            startSync();
        };
        nav.appendChild(btn);
    });
}

// --- GLOBALE ACTIES ---

// Nieuw: Toggle functie die niet triggert als je op de bewerkbare titel klikt
window.toggleCard = (e, header) => {
    // Alleen openklappen als er niet in de titel geklikt wordt (dat handelen we af met stopPropagation in HTML)
    header.parentElement.classList.toggle('open');
};

window.addItem = async () => {
    const input = document.getElementById('mainInput');
    if (!input.value.trim()) return;

    const collectionName = activeCategory === 'Notitieblok' ? 'notes' : 'tasks';
    const data = activeCategory === 'Notitieblok' ? {
        text: input.value,
        timestamp: Date.now()
    } : {
        text: input.value,
        cat: document.getElementById('catSelect').value,
        prio: document.getElementById('prioSelect').value,
        completed: false,
        note: "",
        timestamp: Date.now()
    };

    await addDoc(collection(db, collectionName), data);
    input.value = '';
};

window.saveField = async (id, field, val) => {
    const col = activeCategory === 'Notitieblok' ? 'notes' : 'tasks';
    await updateDoc(doc(db, col, id), { [field]: val });
};

window.completeTask = async (id) => {
    await updateDoc(doc(db, 'tasks', id), { completed: true });
};

// NIEUW: Terugzetten van voltooide taak
window.undoComplete = async (id) => {
    await updateDoc(doc(db, 'tasks', id), { completed: false });
};

window.deleteItem = async (id) => {
    const col = activeCategory === 'Notitieblok' ? 'notes' : 'tasks';
    if(confirm("Verwijderen?")) await deleteDoc(doc(db, col, id));
};

window.toggleCompleted = () => {
    document.getElementById('completed-container').classList.toggle('hidden');
    // Pijl omdraaien
    const arrow = document.getElementById('completed-arrow');
    arrow.innerText = arrow.innerText === '▼' ? '▲' : '▼';
};

window.toggleTheme = () => {
    document.body.classList.toggle('dark-mode');
};