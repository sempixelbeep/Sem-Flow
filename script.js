import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let activeCategory = 'alles';
let cloudData = [];
const taskCategories = ['alles', 'algemeen', 'ideeën', 'opschrijven', 'kopen', 'werk', 'privé', 'overige', 'later'];
const allTabs = [...taskCategories, 'notitieblok'];

window.onload = () => {
    fillCategoryDropdown();
    startSync();
};

function fillCategoryDropdown() {
    const sel = document.getElementById('catSelect');
    if(!sel) return;
    taskCategories.filter(c => c !== 'alles').forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        sel.appendChild(opt);
    });
}

function startSync() {
    const colName = activeCategory === 'notitieblok' ? 'notes' : 'tasks';
    const q = query(collection(db, colName), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.render();
    });
}

window.render = () => {
    renderCategoryNav();
    const container = document.getElementById('list-container');
    const compContainer = document.getElementById('completed-container');
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
    
    container.innerHTML = '';
    compContainer.innerHTML = '';

    cloudData.forEach(item => {
        // Filter: Categorie
        if (activeCategory !== 'alles' && activeCategory !== 'notitieblok' && item.cat !== activeCategory) return;
        
        // Filter: Zoeken
        const textMatch = item.text?.toLowerCase().includes(searchTerm);
        const noteMatch = item.note?.toLowerCase().includes(searchTerm);
        if (searchTerm && !textMatch && !noteMatch) return;

        const div = document.createElement('div');

        if (activeCategory === 'notitieblok') {
            div.className = 'taak-kaart notitie-card';
            div.innerHTML = `
                <div class="header-info">
                    <div class="taak-naam" contenteditable="true" style="font-size: 20px;" onblur="window.saveField('${item.id}', 'text', this.innerText)">${item.text}</div>
                    <span class="cat-label">${new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
                <textarea class="notitie-textarea" onblur="window.saveField('${item.id}', 'note', this.value)" placeholder="begin hier met schrijven...">${item.note || ''}</textarea>
                <div class="actions">
                    <button class="btn-row delete" onclick="window.deleteItem('${item.id}')">🗑️ wis notitie</button>
                </div>`;
            container.appendChild(div);
        } else {
            div.className = `taak-kaart prio-${item.prio || 2} ${item.completed ? 'completed' : ''}`;
            div.innerHTML = `
                <div class="kaart-header" onclick="window.toggleCard(event, this)">
                    <div class="header-info">
                        <span class="cat-label">${item.cat}</span>
                        <div class="taak-naam" contenteditable="true" onclick="event.stopPropagation()" onblur="window.saveField('${item.id}', 'text', this.innerText)">${item.text}</div>
                    </div>
                    <div class="expand-arrow">▼</div>
                </div>
                <div class="kaart-body">
                    <textarea onblur="window.saveField('${item.id}', 'note', this.value)" placeholder="notitie...">${item.note || ''}</textarea>
                    <div class="actions">
                        ${!item.completed ? 
                            `<button class="btn-row" onclick="window.completeTask('${item.id}')">✅ voltooien</button>` : 
                            `<button class="btn-row restore" onclick="window.undoComplete('${item.id}')">♻️ terugzetten</button>`
                        }
                        <button class="btn-row secondary" onclick="window.quickChangeCat('${item.id}')">📁 categorie</button>
                        <button class="btn-row secondary" onclick="window.quickChangePrio('${item.id}')">🚩 prio</button>
                        <button class="btn-row delete" onclick="window.deleteItem('${item.id}')">🗑️ wis</button>
                    </div>
                </div>`;
            item.completed ? compContainer.appendChild(div) : container.appendChild(div);
        }
    });
};

function renderCategoryNav() {
    const nav = document.getElementById('categoryNav');
    nav.innerHTML = '';
    allTabs.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `nav-pill ${activeCategory === cat ? 'active' : ''} ${cat === 'notitieblok' ? 'special' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => { activeCategory = cat; startSync(); };
        nav.appendChild(btn);
    });
}

window.addItem = async () => {
    const input = document.getElementById('mainInput');
    if (!input.value.trim()) return;
    const col = activeCategory === 'notitieblok' ? 'notes' : 'tasks';
    const data = activeCategory === 'notitieblok' ? { text: input.value, timestamp: Date.now() } : {
        text: input.value, cat: document.getElementById('catSelect').value,
        prio: document.getElementById('prioSelect').value, completed: false, note: "", timestamp: Date.now()
    };
    await addDoc(collection(db, col), data);
    input.value = '';
};

window.saveField = async (id, field, val) => {
    const col = activeCategory === 'notitieblok' ? 'notes' : 'tasks';
    await updateDoc(doc(db, col, id), { [field]: val.trim() });
};

window.quickChangeCat = async (id) => {
    const newCat = prompt(`nieuwe categorie:\n${taskCategories.filter(c=>c!=='alles').join(', ')}`);
    if (newCat && taskCategories.includes(newCat.toLowerCase())) await updateDoc(doc(db, 'tasks', id), { cat: newCat.toLowerCase() });
};

window.quickChangePrio = async (id) => {
    const newPrio = prompt("prio: 1 (hoog), 2 (normaal), 3 (laag)");
    if (['1','2','3'].includes(newPrio)) await updateDoc(doc(db, 'tasks', id), { prio: newPrio });
};

window.completeTask = async (id) => { await updateDoc(doc(db, 'tasks', id), { completed: true }); };
window.undoComplete = async (id) => { await updateDoc(doc(db, 'tasks', id), { completed: false }); };
window.deleteItem = async (id) => { if(confirm("verwijderen?")) await deleteDoc(doc(db, activeCategory === 'notitieblok' ? 'notes' : 'tasks', id)); };
window.toggleCard = (e, header) => { header.parentElement.classList.toggle('open'); };
window.toggleCompleted = () => { document.getElementById('completed-container').classList.toggle('hidden'); };
window.toggleTheme = () => { document.body.classList.toggle('dark-mode'); };