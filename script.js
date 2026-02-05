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

let cloudData = [];
const taskCategories = ['algemeen', 'ideeën', 'opschrijven', 'kopen', 'werk', 'privé', 'overige', 'later'];

window.onload = () => {
    fillDropdown();
    startSync();
};

function fillDropdown() {
    const sel = document.getElementById('catSelect');
    if (!sel) return;
    taskCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.innerText = cat;
        sel.appendChild(opt);
    });
}

function startSync() {
    const q = query(collection(db, "tasks"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.render();
    });
}

window.render = () => {
    const board = document.getElementById('board-container');
    const compContainer = document.getElementById('completed-container');
    const searchTerm = (document.getElementById('searchInput')?.value || "").toLowerCase();
    
    if (!board) return;
    board.innerHTML = '';
    compContainer.innerHTML = '';
    let doneCount = 0;

    // Render Kolommen
    taskCategories.forEach(catName => {
        const col = document.createElement('div');
        col.className = 'board-column';
        
        const tasks = cloudData.filter(t => t.cat === catName && !t.completed);
        const filtered = tasks.filter(t => (t.text || "").toLowerCase().includes(searchTerm));

        col.innerHTML = `
            <div class="column-header">${catName} <span>${filtered.length}</span></div>
            <div class="task-list" data-cat="${catName}" id="list-${catName}"></div>
        `;
        board.appendChild(col);

        const listEl = col.querySelector('.task-list');
        filtered.forEach(item => listEl.appendChild(createTaskCard(item)));

        // Drag & Drop activeren
        new Sortable(listEl, {
            group: 'tasks',
            animation: 150,
            handle: '.drag-handle',
            onEnd: async (evt) => {
                const taskId = evt.item.getAttribute('data-id');
                const newCat = evt.to.getAttribute('data-cat');
                await updateDoc(doc(db, "tasks", taskId), { cat: newCat });
            }
        });
    });

    // Render Voltooid
    cloudData.filter(t => t.completed).forEach(item => {
        doneCount++;
        compContainer.appendChild(createTaskCard(item));
    });
    document.getElementById('doneCount').innerText = doneCount;
};

function createTaskCard(item) {
    const div = document.createElement('div');
    div.setAttribute('data-id', item.id);
    div.className = `taak-kaart prio-${item.prio || 2} ${item.completed ? 'completed' : ''}`;
    
    const dl = item.deadline ? `🕒 ${new Date(item.deadline).toLocaleString([], {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}` : '';

    div.innerHTML = `
        <div class="kaart-header" onclick="window.toggleCard(this)">
            <div class="drag-handle">⠿</div>
            <div class="header-info">
                <div class="taak-naam" contenteditable="true" onclick="event.stopPropagation()" onblur="window.saveField('${item.id}', 'text', this.innerText)">${item.text}</div>
                ${dl ? `<span class="deadline-label">${dl}</span>` : ''}
            </div>
        </div>
        <div class="kaart-body">
            <div class="body-inner">
                <textarea onblur="window.saveField('${item.id}', 'note', this.value)" placeholder="notitie...">${item.note || ''}</textarea>
                <div class="actions">
                    <button class="btn-row" onclick="window.completeTask('${item.id}', ${item.completed})">
                        ${item.completed ? '♻️ terug' : '✅ klaar'}
                    </button>
                    <button class="btn-row delete" onclick="window.deleteItem('${item.id}')">🗑️ wis</button>
                </div>
            </div>
        </div>`;
    return div;
}

window.addItem = async () => {
    const input = document.getElementById('mainInput');
    if (!input.value.trim()) return;

    await addDoc(collection(db, "tasks"), {
        text: input.value,
        cat: document.getElementById('catSelect').value,
        prio: document.getElementById('prioSelect').value,
        deadline: document.getElementById('dateInput').value || null,
        completed: false,
        note: "",
        timestamp: Date.now()
    });
    input.value = '';
};

window.saveField = async (id, field, val) => {
    await updateDoc(doc(db, "tasks", id), { [field]: val });
};

window.completeTask = async (id, currentState) => {
    await updateDoc(doc(db, "tasks", id), { completed: !currentState });
};

window.deleteItem = async (id) => {
    if(confirm("Wis taak?")) await deleteDoc(doc(db, "tasks", id));
};

window.toggleCard = (el) => el.parentElement.classList.toggle('open');

window.toggleCompleted = () => {
    const cont = document.getElementById('completed-container');
    cont.classList.toggle('hidden');
    document.getElementById('completed-arrow').style.transform = cont.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
};

window.toggleTheme = () => document.body.classList.toggle('dark-mode');