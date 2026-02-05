import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const categories = ['Alles', 'Algemeen', 'Ideeën', 'Opschrijven', 'Kopen', 'Werk', 'Privé', 'Overige', 'Later'];

// --- FIX: Exporteer functies naar window voor de HTML ---
window.setTab = (m) => {
    mode = m;
    const taskBtn = document.getElementById('taskBtn');
    const noteBtn = document.getElementById('noteBtn');
    const sortOpts = document.getElementById('sort-options');
    const prioSel = document.getElementById('prioSelect');
    const catCont = document.getElementById('cat-container');

    if(taskBtn) taskBtn.className = `tab-btn ${mode === 'tasks' ? 'active' : ''}`;
    if(noteBtn) noteBtn.className = `tab-btn ${mode === 'notes' ? 'active' : ''}`;
    if(sortOpts) sortOpts.style.display = mode === 'notes' ? 'block' : 'none';
    if(prioSel) prioSel.style.display = mode === 'tasks' ? 'block' : 'none';
    if(catCont) catCont.style.display = mode === 'tasks' ? 'block' : 'none';
    
    startSync();
};

window.toggleCompleted = () => {
    const container = document.getElementById('completed-container');
    const arrow = document.getElementById('completed-arrow');
    if(container) {
        const isHidden = container.classList.toggle('hidden');
        if(arrow) arrow.innerText = isHidden ? '▼' : '▲';
    }
};

window.addItem = async () => {
    const input = document.getElementById('mainInput');
    const prio = document.getElementById('prioSelect');
    if (!input || !input.value.trim()) return;
    
    let targetCat = activeCategory === 'Alles' ? 'Algemeen' : activeCategory;

    await addDoc(collection(db, mode), {
        text: input.value,
        cat: targetCat,
        prio: prio ? prio.value : "3",
        completed: false,
        timestamp: Date.now(),
        note: ""
    });
    input.value = '';
};

// --- DATA LOGICA ---
function startSync() {
    const q = query(collection(db, mode), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        render();
        if(mode === 'tasks') renderCategoryNav();
    });
}

function renderCategoryNav() {
    const nav = document.getElementById('categoryNav');
    if(!nav) return;
    nav.innerHTML = '';
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `nav-pill ${activeCategory === cat ? 'active' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => { activeCategory = cat; render(); renderCategoryNav(); };
        nav.appendChild(btn);
    });
}

function render() {
    const container = document.getElementById('list-container');
    const completedContainer = document.getElementById('completed-container');
    if(!container) return;
    
    container.innerHTML = '';
    if(completedContainer) completedContainer.innerHTML = '';

    let items = [...cloudData];
    if (mode === 'tasks' && activeCategory !== 'Alles') {
        items = items.filter(i => i.cat === activeCategory);
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = `taak-kaart prio-${item.prio || 3}`;
        
        if(item.completed) {
            div.innerHTML = `<div class="completed-item">${item.text}</div>`;
            if(completedContainer) completedContainer.appendChild(div);
        } else {
            div.innerHTML = `
                <div class="kaart-header" onclick="this.parentElement.classList.toggle('open')">
                    <div class="header-info">
                        <span class="cat-label">${item.cat || 'Algemeen'}</span>
                        <div class="taak-naam">${item.text}</div>
                    </div>
                    <div class="expand-arrow">▼</div>
                </div>
                <div class="kaart-body">
                    <div class="body-inner">
                        <div class="taak-notitie" contenteditable="true" onblur="window.saveField('${item.id}', 'note', this.innerHTML)">${item.note || 'Notitie...'}</div>
                        <button class="btn-row" onclick="window.completeTask('${item.id}')">✅ Klaar</button>
                    </div>
                </div>`;
            container.appendChild(div);
        }
    });
}

// Global functions for window
window.saveField = async (id, field, val) => { await updateDoc(doc(db, mode, id), { [field]: val }); };
window.completeTask = async (id) => { await updateDoc(doc(db, 'tasks', id), { completed: true }); };
window.toggleTheme = () => { document.body.classList.toggle('dark-mode'); };

startSync();