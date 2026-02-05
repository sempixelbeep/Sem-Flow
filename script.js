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

let mode = 'tasks';
let activeCategory = 'Alles';
let cloudData = [];
const taskCategories = ['Alles', 'Algemeen', 'Ideeën', 'Opschrijven', 'Kopen', 'Werk', 'Privé', 'Overige', 'Later'];
const allTabs = [...taskCategories, 'Notitieblok'];

// --- INITIALISATIE ---
window.onload = () => {
    fillCategoryDropdown();
    startSync();
};

function fillCategoryDropdown() {
    const sel = document.getElementById('catSelect');
    // We filteren 'Alles' en 'Notitieblok' uit de dropdown voor het toevoegen
    taskCategories.filter(c => c !== 'Alles').forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        sel.appendChild(opt);
    });
}

function startSync() {
    // Als we in Notitieblok zitten, laden we de 'notes' collectie
    const collectionName = activeCategory === 'Notitieblok' ? 'notes' : 'tasks';
    const q = query(collection(db, collectionName), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        render();
    });
}

// --- RENDER ---
window.render = () => {
    renderCategoryNav();
    const container = document.getElementById('list-container');
    const compContainer = document.getElementById('completed-container');
    container.innerHTML = '';
    compContainer.innerHTML = '';

    cloudData.forEach(item => {
        // Filtering: alleen tonen als categorie matcht (tenzij we op 'Alles' staan)
        if (activeCategory !== 'Alles' && activeCategory !== 'Notitieblok' && item.cat !== activeCategory) return;

        const div = document.createElement('div');
        
        if (activeCategory === 'Notitieblok') {
            // Notitie stijl
            div.className = 'taak-kaart';
            div.innerHTML = `<div class="kaart-header">📔 ${item.text || item.title}</div>`;
        } else {
            // Taak stijl
            if (item.completed) {
                const cDiv = document.createElement('div');
                cDiv.className = 'completed-item';
                cDiv.innerText = item.text;
                compContainer.appendChild(cDiv);
                return;
            }
            div.className = `taak-kaart prio-${item.prio || 3}`;
            div.innerHTML = `
                <div class="kaart-header" onclick="this.parentElement.classList.toggle('open')">
                    <div class="header-info">
                        <span class="cat-label">${item.cat}</span>
                        <div class="taak-naam">${item.text}</div>
                    </div>
                    <div class="expand-arrow">▼</div>
                </div>
                <div class="kaart-body">
                    <textarea onblur="window.saveField('${item.id}', 'note', this.value)" placeholder="Notitie toevoegen...">${item.note || ''}</textarea>
                    <div class="actions">
                        <button class="btn-row" onclick="window.completeTask('${item.id}')">✅ Voltooien</button>
                        <button class="btn-row delete" onclick="window.deleteItem('${item.id}')">🗑️ Verwijderen</button>
                    </div>
                </div>`;
        }
        container.appendChild(div);
    });
};

function renderCategoryNav() {
    const nav = document.getElementById('categoryNav');
    nav.innerHTML = '';
    allTabs.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `nav-pill ${activeCategory === cat ? 'active' : ''} ${cat === 'Notitieblok' ? 'special' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => {
            activeCategory = cat;
            startSync(); // Herstart sync voor de juiste collectie
        };
        nav.appendChild(btn);
    });
}

// --- ACTIES ---
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

window.deleteItem = async (id) => {
    const col = activeCategory === 'Notitieblok' ? 'notes' : 'tasks';
    if(confirm("Verwijderen?")) await deleteDoc(doc(db, col, id));
};

window.toggleCompleted = () => {
    const cont = document.getElementById('completed-container');
    cont.classList.toggle('hidden');
};

window.toggleTheme = () => {
    document.body.classList.toggle('dark-mode');
};