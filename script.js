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

    let openCount = 0;
    let doneCount = 0;

    cloudData.forEach(item => {
        if (activeCategory !== 'alles' && activeCategory !== 'notitieblok' && item.cat !== activeCategory) return;
        
        const textMatch = item.text?.toLowerCase().includes(searchTerm);
        if (searchTerm && !textMatch) return;

        if (item.completed) doneCount++; else openCount++;

        const div = document.createElement('div');
        const deadlineTxt = item.deadline ? `🕒 ${new Date(item.deadline).toLocaleString([], {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}` : '';

        if (activeCategory === 'notitieblok') {
            div.className = 'taak-kaart notitie-card open';
            div.innerHTML = `
                <div class="body-inner">
                    <div class="taak-naam" contenteditable="true" style="font-size: 20px;" onblur="window.saveField('${item.id}', 'text', this.innerText)">${item.text}</div>
                    <textarea class="notitie-textarea" style="width:100%; min-height:200px; border:none; outline:none; background:transparent; color:inherit; font-family:inherit; margin-top:10px;" onblur="window.saveField('${item.id}', 'note', this.value)">${item.note || ''}</textarea>
                    <button class="btn-row delete" onclick="window.deleteItem('${item.id}')">🗑️ wis</button>
                </div>`;
            container.appendChild(div);
        } else {
            div.className = `taak-kaart prio-${item.prio || 2} ${item.completed ? 'completed' : ''}`;
            div.innerHTML = `
                <div class="kaart-header" onclick="window.toggleCard(this)">
                    <div class="header-info">
                        <span class="cat-label">${item.cat}</span>
                        <div class="taak-naam" contenteditable="true" onclick="event.stopPropagation()" onblur="window.saveField('${item.id}', 'text', this.innerText)">${item.text}</div>
                        ${deadlineTxt ? `<span class="deadline-label">${deadlineTxt}</span>` : ''}
                    </div>
                    <div class="expand-arrow">▼</div>
                </div>
                <div class="kaart-body">
                    <div class="body-inner">
                        <textarea onblur="window.saveField('${item.id}', 'note', this.value)" placeholder="notitie...">${item.note || ''}</textarea>
                        <div class="actions">
                            ${!item.completed ? `<button class="btn-row" onclick="window.completeTask('${item.id}')">✅ klaar</button>` : `<button class="btn-row restore" onclick="window.undoComplete('${item.id}')">♻️ terug</button>`}
                            <select class="btn-row inline-select" onchange="window.saveField('${item.id}', 'cat', this.value)">
                                ${taskCategories.filter(c=>c!=='alles').map(c => `<option value="${c}" ${item.cat === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                            <select class="btn-row inline-select" onchange="window.saveField('${item.id}', 'prio', this.value)">
                                <option value="1" ${item.prio == '1' ? 'selected' : ''}>prio 1</option>
                                <option value="2" ${item.prio == '2' ? 'selected' : ''}>prio 2</option>
                                <option value="3" ${item.prio == '3' ? 'selected' : ''}>prio 3</option>
                            </select>
                            <button class="btn-row delete" onclick="window.deleteItem('${item.id}')">🗑️ wis</button>
                        </div>
                    </div>
                </div>`;
            item.completed ? compContainer.appendChild(div) : container.appendChild(div);
        }
    });

    document.getElementById('openCount').innerText = openCount;
    document.getElementById('doneCount').innerText = doneCount;
};

function renderCategoryNav() {
    const nav = document.getElementById('categoryNav');
    nav.innerHTML = '';
    [...taskCategories, 'notitieblok'].forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `nav-pill ${activeCategory === cat ? 'active' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => { activeCategory = cat; startSync(); };
        nav.appendChild(btn);
    });
}

window.addItem = async () => {
    const input = document.getElementById('mainInput');
    const dateInput = document.getElementById('dateInput');
    if (!input.value.trim()) return;
    const col = activeCategory === 'notitieblok' ? 'notes' : 'tasks';
    const data = {
        text: input.value, cat: document.getElementById('catSelect').value,
        prio: document.getElementById('prioSelect').value, deadline: dateInput.value || null,
        completed: false, note: "", timestamp: Date.now()
    };
    await addDoc(collection(db, col), data);
    input.value = ''; dateInput.value = '';
};

window.toggleCard = (el) => {
    const card = el.parentElement;
    card.classList.toggle('open');
    const arrow = el.querySelector('.expand-arrow');
    arrow.style.transform = card.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
};

window.saveField = async (id, field, val) => {
    const col = activeCategory === 'notitieblok' ? 'notes' : 'tasks';
    await updateDoc(doc(db, col, id), { [field]: val.trim() });
};

window.completeTask = async (id) => { await updateDoc(doc(db, 'tasks', id), { completed: true }); };
window.undoComplete = async (id) => { await updateDoc(doc(db, 'tasks', id), { completed: false }); };
window.deleteItem = async (id) => { if(confirm("verwijderen?")) await deleteDoc(doc(db, activeCategory === 'notitieblok' ? 'notes' : 'tasks', id)); };
window.toggleCompleted = () => { document.getElementById('completed-container').classList.toggle('hidden'); };
window.toggleTheme = () => { document.body.classList.toggle('dark-mode'); };