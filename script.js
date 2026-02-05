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

const categories = ['Algemeen', 'Ideeën', 'Opschrijven', 'Kopen', 'Werk', 'Privé', 'Overige', 'Later', 'Notities'];
let cloudData = [];

window.onload = () => {
    const catSelect = document.getElementById('catSelect');
    categories.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    
    document.getElementById('mainInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.addItem();
    });

    startSync();
};

function startSync() {
    onSnapshot(query(collection(db, "tasks"), orderBy("timestamp", "desc")), (snap) => {
        cloudData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!document.activeElement.hasAttribute('contenteditable')) window.render();
    });
}

window.render = () => {
    const container = document.getElementById('board-container');
    container.innerHTML = '';

    categories.forEach(cat => {
        const tasks = cloudData.filter(t => t.cat === cat);
        const col = document.createElement('div');
        col.className = 'board-column';
        col.innerHTML = `<h3>${cat}</h3><div class="task-list" id="list-${cat}" data-cat="${cat}"></div>`;
        container.appendChild(col);

        const list = col.querySelector('.task-list');
        tasks.forEach(t => list.appendChild(createCard(t)));

        new Sortable(list, { group: 'tasks', animation: 200, onEnd: async (e) => {
            await updateDoc(doc(db, "tasks", e.item.dataset.id), { cat: e.to.dataset.cat });
        }});
    });
};

function createCard(t) {
    const div = document.createElement('div');
    div.className = `taak-kaart prio-${t.prio || 3} ${t.completed ? 'completed' : ''}`;
    div.dataset.id = t.id;

    // Voeg Particles toe
    const symbols = { '1': '🔥', '2': '🔸', '3': '💎', '4': '🟢' };
    const amount = t.prio == '1' ? 8 : 3;
    for(let i=0; i<amount; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        p.innerText = symbols[t.prio] || '✨';
        if(t.prio == '1' && i % 2 == 0) p.innerText = '💨'; // Rook voor extreem
        p.style.left = Math.random() * 80 + 10 + '%';
        p.style.animationDelay = Math.random() * 2 + 's';
        div.appendChild(p);
    }

    const dl = t.deadline ? `<div class="deadline-badge">🕒 ${new Date(t.deadline).toLocaleString()}</div>` : '';

    div.innerHTML += `
        <div class="kaart-header" onclick="window.toggleCard(this)">
            <div class="taak-naam" contenteditable="true" onblur="window.save('${t.id}', 'text', this.innerText)" onclick="event.stopPropagation()">${t.text}</div>
            ${dl}
        </div>
        <div class="kaart-body">
            <div class="body-inner">
                <textarea onblur="window.save('${t.id}', 'note', this.value)" placeholder="Notities...">${t.note || ''}</textarea>
                
                <div class="edit-grid">
                    <div class="edit-item"><label>Categorie</label>
                        <select onchange="window.save('${t.id}', 'cat', this.value)">
                            ${categories.map(c => `<option value="${c}" ${t.cat==c?'selected':''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="edit-item"><label>Prioriteit</label>
                        <select onchange="window.save('${t.id}', 'prio', this.value)">
                            <option value="1" ${t.prio=='1'?'selected':''}>💥 Extreem</option>
                            <option value="2" ${t.prio=='2'?'selected':''}>🔥 Hoog</option>
                            <option value="3" ${t.prio=='3'?'selected':''}>🔹 Normaal</option>
                            <option value="4" ${t.prio=='4'?'selected':''}>🌱 Laag</option>
                        </select>
                    </div>
                    <div class="edit-item"><label>Deadline</label>
                        <input type="datetime-local" class="inline-input" value="${t.deadline || ''}" onchange="window.save('${t.id}', 'deadline', this.value)">
                    </div>
                    <div class="edit-item"><label>Status</label>
                        <button class="btn-task btn-complete" onclick="window.complete('${t.id}', ${t.completed})">${t.completed?'Heropen':'Klaar'}</button>
                    </div>
                </div>
                
                <div class="actions">
                    <button class="btn-task btn-remind" onclick="alert('Herinnering ingesteld!')">🔔 Herinnering</button>
                    <button class="btn-task btn-delete" onclick="window.del('${t.id}')">🗑️ Wissen</button>
                </div>
            </div>
        </div>`;
    return div;
}

window.toggleCard = (el) => el.parentElement.classList.toggle('open');
window.save = async (id, f, v) => await updateDoc(doc(db, "tasks", id), { [f]: v });
window.complete = async (id, s) => await updateDoc(doc(db, "tasks", id), { completed: !s });
window.del = async (id) => confirm("Wissen?") && await deleteDoc(doc(db, "tasks", id));
window.addItem = async () => {
    const val = document.getElementById('mainInput').value;
    if(!val) return;
    await addDoc(collection(db, "tasks"), {
        text: val, cat: document.getElementById('catSelect').value,
        prio: document.getElementById('prioSelect').value,
        deadline: document.getElementById('dateInput').value || null,
        completed: false, timestamp: Date.now()
    });
    document.getElementById('mainInput').value = '';
};
window.toggleTheme = () => document.body.classList.toggle('dark-mode');