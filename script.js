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
const taskCategories = ['Algemeen', 'Ideeën', 'Opschrijven', 'Kopen', 'Werk', 'Privé', 'Overige', 'Later'];

window.onload = () => {
    const sel = document.getElementById('catSelect');
    taskCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.innerText = cat;
        sel.appendChild(opt);
    });
    startSync();
};

function startSync() {
    const q = query(collection(db, "tasks"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.render();
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

        col.innerHTML = `
            <div class="column-header">${catName}</div>
            <div class="cat-stats">Open: ${openTasks.length} | Klaar: ${doneTasks.length}</div>
            <div class="task-list" data-cat="${catName}" id="list-${catName}"></div>
        `;
        board.appendChild(col);

        const listEl = col.querySelector('.task-list');
        // Render eerst open taken, dan voltooide
        [...openTasks, ...doneTasks].forEach(item => {
            listEl.appendChild(createTaskCard(item));
        });

        new Sortable(listEl, {
            group: 'tasks',
            animation: 150,
            delay: 200, // Fix voor mobiel scrollen
            delayOnTouchOnly: true,
            handle: '.taak-kaart',
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
    div.setAttribute('data-id', item.id);
    div.className = `taak-kaart prio-${item.prio || 2} ${item.completed ? 'completed' : ''}`;
    
    const dl = item.deadline ? `🕒 ${new Date(item.deadline).toLocaleString([], {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}` : '';

    div.innerHTML = `
        <span class="material-icons-round edit-icon" onclick="window.editName('${item.id}', event)">edit</span>
        <div class="kaart-header" onclick="window.toggleCard(this)">
            <div class="header-info">
                <div class="taak-naam" id="name-${item.id}">${item.text}</div>
                ${dl ? `<span class="deadline-label">${dl}</span>` : ''}
            </div>
        </div>
        <div class="kaart-body">
            <div class="body-inner">
                <textarea onblur="window.saveField('${item.id}', 'note', this.value)" placeholder="Notitie...">${item.note || ''}</textarea>
                
                <div class="inline-edit-group">
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
                    </div>
                    <div class="inline-item">
                        <span class="inline-label">Categorie</span>
                        <select class="inline-select" onchange="window.saveField('${item.id}', 'cat', this.value)">
                            ${taskCategories.map(c => `<option value="${c}" ${item.cat === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="actions">
                    <button class="btn-row" style="background: ${item.completed ? '#eee' : '#27ae6020'}; color: ${item.completed ? '#666' : '#27ae60'}" onclick="window.completeTask('${item.id}', ${item.completed})">
                        ${item.completed ? '♻️ Heropenen' : '✅ Voltooien'}
                    </button>
                    <button class="btn-row delete" onclick="window.deleteItem('${item.id}')">🗑️ Wissen</button>
                </div>
            </div>
        </div>`;
    return div;
}

window.editName = (id, e) => {
    e.stopPropagation();
    const current = document.getElementById(`name-${id}`).innerText;
    const newName = prompt("Wijzig taaknaam:", current);
    if (newName && newName !== current) window.saveField(id, 'text', newName);
};

window.addItem = async () => {
    const input = document.getElementById('mainInput');
    if (!input.value.trim()) return;
    await addDoc(collection(db, "tasks"), {
        text: input.value,
        cat: document.getElementById('catSelect').value,
        prio: document.getElementById('prioSelect').value,
        deadline: document.getElementById('dateInput').value || null,
        completed: false, note: "", timestamp: Date.now()
    });
    input.value = '';
};

window.saveField = async (id, field, val) => { await updateDoc(doc(db, "tasks", id), { [field]: val }); };
window.completeTask = async (id, state) => { await updateDoc(doc(db, "tasks", id), { completed: !state }); };
window.deleteItem = async (id) => { if(confirm("Taak wissen?")) await deleteDoc(doc(db, "tasks", id)); };
window.toggleCard = (el) => el.parentElement.classList.toggle('open');
window.toggleTheme = () => document.body.classList.toggle('dark-mode');