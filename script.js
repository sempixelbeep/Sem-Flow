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
const taskCategories = ['Algemeen', 'Ideeën', 'Opschrijven', 'Kopen', 'Werk', 'Privé', 'Overige', 'Later', 'Notities'];

window.onload = () => {
    const sel = document.getElementById('catSelect');
    taskCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.innerText = cat;
        sel.appendChild(opt);
    });

    document.getElementById('mainInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.addItem();
    });

    startSync();
};

function startSync() {
    const q = query(collection(db, "tasks"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!document.activeElement.hasAttribute('contenteditable')) {
            window.render();
        }
    });
}

window.render = () => {
    const board = document.getElementById('board-container');
    const searchTerm = (document.getElementById('searchInput')?.value || "").toLowerCase();
    if (!board) return;
    board.innerHTML = '';

    taskCategories.forEach(catName => {
        const col = document.createElement('div');
        col.className = 'board-column';
        
        const catTasks = cloudData.filter(t => t.cat === catName);
        const openTasks = catTasks.filter(t => !t.completed && t.text.toLowerCase().includes(searchTerm));
        const doneTasks = catTasks.filter(t => t.completed && t.text.toLowerCase().includes(searchTerm));

        const total = catTasks.length;
        const doneCount = catTasks.filter(t => t.completed).length;
        const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

        col.innerHTML = `
            <div class="column-header">${catName}</div>
            <div class="cat-stats"><span>${openTasks.length} items</span><span>${percent}%</span></div>
            <div class="progress-container"><div class="progress-fill" style="width: ${percent}%"></div></div>
            <div class="task-list" data-cat="${catName}" id="list-${catName}"></div>
        `;
        board.appendChild(col);

        const listEl = col.querySelector('.task-list');
        openTasks.forEach(item => listEl.appendChild(createTaskCard(item)));

        if (doneTasks.length > 0) {
            const sep = document.createElement('div'); sep.className = 'done-separator';
            const txt = document.createElement('div'); txt.className = 'done-text'; txt.innerText = 'Voltooid';
            listEl.appendChild(sep); listEl.appendChild(txt);
            doneTasks.forEach(item => listEl.appendChild(createTaskCard(item)));
        }

        new Sortable(listEl, {
            group: 'tasks', animation: 200, delay: 250, delayOnTouchOnly: true,
            onEnd: async (evt) => {
                const taskId = evt.item.getAttribute('data-id');
                const newCat = evt.to.getAttribute('data-cat');
                await updateDoc(doc(db, "tasks", taskId), { cat: newCat });
            }
        });
    });
};

function createTaskCard(item) {
    const div = document.createElement('div');
    const isNote = item.cat === 'Notities';
    div.setAttribute('data-id', item.id);
    div.className = `taak-kaart prio-${item.prio || 2} ${item.completed ? 'completed' : ''} ${isNote ? 'cat-notities' : ''}`;
    
    const dl = item.deadline ? `🕒 ${new Date(item.deadline).toLocaleString([], {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}` : '';

    div.innerHTML = `
        <div class="kaart-header" onclick="window.toggleCard(this)">
            <div class="taak-naam" contenteditable="true" onclick="event.stopPropagation()" onblur="window.saveField('${item.id}', 'text', this.innerText)">${item.text}</div>
        </div>
        <div class="kaart-body">
            <div class="body-inner">
                ${dl ? `<span style="font-size:11px; color:#ff3b30; font-weight:800; margin-bottom:10px;">${dl}</span>` : ''}
                ${isNote ? 
                    `<div class="rich-note-editor" contenteditable="true" onblur="window.saveField('${item.id}', 'note', this.innerHTML)">${item.note || ''}</div>` :
                    `<textarea onblur="window.saveField('${item.id}', 'note', this.value)" placeholder="Notitie...">${item.note || ''}</textarea>`
                }
                <div class="inline-edit-group">
                    ${!isNote ? `
                    <div class="inline-item">
                        <span class="inline-label">Prioriteit</span>
                        <select class="inline-select" onchange="window.saveField('${item.id}', 'prio', this.value)">
                            <option value="1" ${item.prio == '1' ? 'selected' : ''}>🔥 Hoog</option>
                            <option value="2" ${item.prio == '2' ? 'selected' : ''}>🔹 Normaal</option>
                            <option value="3" ${item.prio == '3' ? 'selected' : ''}>🌱 Laag</option>
                        </select>
                    </div>
                    <div class="inline-item">
                        <span class="inline-label">Deadline</span>
                        <input type="datetime-local" class="inline-date" value="${item.deadline || ''}" onchange="window.saveField('${item.id}', 'deadline', this.value)">
                    </div>` : ''}
                    <div class="inline-item">
                        <span class="inline-label">Categorie</span>
                        <select class="inline-select" onchange="window.saveField('${item.id}', 'cat', this.value)">
                            ${taskCategories.map(c => `<option value="${c}" ${item.cat === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="actions">
                    <button class="btn-row complete" onclick="window.completeTask('${item.id}', ${item.completed})">${item.completed ? '♻️ Heropenen' : '✅ Voltooien'}</button>
                    <button class="btn-row delete" onclick="window.deleteItem('${item.id}')">🗑️ Wissen</button>
                </div>
            </div>
        </div>`;
    return div;
}

window.toggleCard = (el) => { if (document.activeElement.hasAttribute('contenteditable')) return; el.parentElement.classList.toggle('open'); };
window.saveField = async (id, f, v) => await updateDoc(doc(db, "tasks", id), { [f]: v });
window.completeTask = async (id, s) => await updateDoc(doc(db, "tasks", id), { completed: !s });
window.deleteItem = async (id) => { if(confirm("Wissen?")) await deleteDoc(doc(db, "tasks", id)); };
window.addItem = async () => {
    const i = document.getElementById('mainInput');
    if (!i.value.trim()) return;
    await addDoc(collection(db, "tasks"), {
        text: i.value, cat: document.getElementById('catSelect').value,
        prio: document.getElementById('prioSelect').value,
        deadline: document.getElementById('dateInput').value || null,
        completed: false, note: "", timestamp: Date.now()
    });
    i.value = '';
};
window.toggleTheme = () => document.body.classList.toggle('dark-mode');