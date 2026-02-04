import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } 
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
let cloudData = [];

// Functie voor Enter-toets
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.addItem();
});

window.setTab = (m) => {
    mode = m;
    document.getElementById('taskBtn').className = `tab-btn ${mode === 'tasks' ? 'active' : ''}`;
    document.getElementById('noteBtn').className = `tab-btn ${mode === 'notes' ? 'active' : ''}`;
    document.getElementById('prioSelect').style.display = mode === 'tasks' ? 'block' : 'none';
    document.getElementById('catSelect').style.display = mode === 'tasks' ? 'block' : 'none';
    startSync();
};

function startSync() {
    const q = query(collection(db, mode), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.render();
        if(mode === 'tasks') updateProgress();
    });
}

function updateProgress() {
    const total = cloudData.length;
    const done = cloudData.filter(t => t.completed).length;
    const perc = total === 0 ? 0 : Math.round((done / total) * 100);
    const bar = document.getElementById('progressBar');
    if(bar) {
        bar.style.width = perc + "%";
        bar.innerText = perc > 10 ? perc + "%" : "";
    }
}

window.render = () => {
    const container = document.getElementById('list-container');
    container.innerHTML = '';
    
    if (cloudData.length === 0) {
        container.innerHTML = `<div class="empty-state">De flow is leeg... begin met typen!</div>`;
        return;
    }

    cloudData.forEach((item) => {
        const div = document.createElement('div');
        div.className = `menu-item ${mode === 'tasks' ? 'prio-' + item.prio : ''} ${item.completed ? 'done' : ''}`;
        
        div.innerHTML = mode === 'tasks' ? 
            `<div class="menu-header">
                <input type="checkbox" ${item.completed ? 'checked' : ''} onclick="window.toggleComplete('${item.id}', ${item.completed})">
                <span class="editable-title" contenteditable="true" onblur="window.saveEdit('${item.id}', this.innerText)">${item.text}</span>
                <small class="cat-tag">${item.cat}</small>
            </div>
            <div class="menu-content"><div class="menu-inner"><button class="btn-del" onclick="window.removeItem('${item.id}')">Verwijderen</button></div></div>` :
            `<div class="menu-header"><span class="editable-title" contenteditable="true" onblur="window.saveEdit('${item.id}', this.innerText)">${item.title}</span></div>
            <div class="menu-content"><div class="menu-inner"><textarea class="note-area" oninput="window.updateNote('${item.id}', this.value)">${item.content || ''}</textarea><button class="btn-del" onclick="window.removeItem('${item.id}')">Verwijderen</button></div></div>`;
        
        div.querySelector('.menu-header').onclick = (e) => {
            if(e.target.classList.contains('editable-title') || e.target.type === 'checkbox') return;
            const content = div.querySelector('.menu-content');
            content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
        };
        container.appendChild(div);
    });
};

window.addItem = async () => {
    const input = document.getElementById('mainInput');
    if (!input.value.trim()) return;
    
    const newItem = mode === 'tasks' ? 
        { text: input.value, prio: document.getElementById('prioSelect').value, cat: document.getElementById('catSelect').value, completed: false, timestamp: Date.now() } :
        { title: input.value, content: "", timestamp: Date.now() };

    await addDoc(collection(db, mode), newItem);
    input.value = '';
    input.focus();
};

window.toggleComplete = async (id, currentStatus) => {
    await updateDoc(doc(db, 'tasks', id), { completed: !currentStatus });
};

window.removeItem = async (id) => {
    if(confirm("Wil je dit item uit de flow halen?")) {
        await deleteDoc(doc(db, mode, id));
    }
};

window.saveEdit = async (id, val) => {
    await updateDoc(doc(db, mode, id), mode === 'tasks' ? { text: val } : { title: val });
};

window.updateNote = async (id, val) => {
    await updateDoc(doc(db, 'notes', id), { content: val });
};

startSync();