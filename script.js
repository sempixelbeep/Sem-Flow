import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- PLAK HIERONDER JOUW FIREBASE CONFIG CODE ---
const firebaseConfig = {
  apiKey: "AIzaSyD-ah3ZTcZAUpbKtqkCAvzr3J1kciJbZlg",
  authDomain: "sem-flow.firebaseapp.com",
  projectId: "sem-flow",
  storageBucket: "sem-flow.firebasestorage.app",
  messagingSenderId: "275773373096",
  appId: "1:275773373096:web:f7d44209c6159fcbdfa09d",
  measurementId: "G-CF0MTZ10YF"
};
// -----------------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let mode = 'tasks';
let currentSort = 'new';
let cloudData = [];

const patterns = {
    tasks: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTUgMTBsNSA1IDEwLTEwIiBzdHJva2U9IiMzMDZBNjAiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==`,
    notes: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTEwIDMwTDMwIDEwIiBzdHJva2U9IiMzMDZBNjAiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==`
};

window.setTab = (m) => {
    mode = m;
    document.getElementById('taskBtn').classList.toggle('active', mode === 'tasks');
    document.getElementById('noteBtn').classList.toggle('active', mode === 'notes');
    document.getElementById('prioSelect').style.display = mode === 'tasks' ? 'block' : 'none';
    document.getElementById('catSelect').style.display = mode === 'tasks' ? 'block' : 'none';
    document.getElementById('filterBar').style.display = mode === 'tasks' ? 'flex' : 'none';
    startSync();
};

window.setSort = (s, btn) => {
    currentSort = s;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.render();
};

function startSync() {
    const q = query(collection(db, mode), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.render();
    });
}

window.render = () => {
    document.getElementById('pattern-layer').style.backgroundImage = `url(${patterns[mode]})`;
    const container = document.getElementById('list-container');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    container.innerHTML = '';
    
    let displayData = [...cloudData];

    if (searchTerm) {
        displayData = displayData.filter(item => (mode === 'tasks' ? item.text : item.title).toLowerCase().includes(searchTerm));
    }

    if (mode === 'tasks') {
        if (currentSort === 'alpha') displayData.sort((a, b) => (a.text || "").localeCompare(b.text || ""));
        else if (currentSort === 'prio') displayData.sort((a, b) => a.prio - b.prio);
    }

    displayData.forEach((item) => {
        const div = document.createElement('div');
        div.className = `menu-item ${mode === 'tasks' ? 'prio-' + item.prio : ''}`;
        
        div.innerHTML = mode === 'tasks' ? 
            `<div class="menu-header"><span class="editable-title" contenteditable="true" onblur="window.saveEdit('${item.id}', this.innerText)">${item.text}</span><small>${item.cat} | P${item.prio}</small></div><div class="menu-content"><div class="menu-inner"><button class="btn-del" onclick="window.removeItem('${item.id}')">VERWIJDER</button></div></div>` :
            `<div class="menu-header"><span class="editable-title" contenteditable="true" onblur="window.saveEdit('${item.id}', this.innerText)">${item.title}</span></div><div class="menu-content"><div class="menu-inner"><textarea class="note-area" oninput="window.updateNote('${item.id}', this.value)">${item.content || ''}</textarea><button class="btn-del" onclick="window.removeItem('${item.id}')">VERWIJDER</button></div></div>`;
        
        div.querySelector('.menu-header').onclick = (e) => {
            if(e.target.classList.contains('editable-title')) return;
            const content = div.querySelector('.menu-content');
            const isOpen = content.style.maxHeight;
            document.querySelectorAll('.menu-content').forEach(c => c.style.maxHeight = null);
            content.style.maxHeight = isOpen ? null : content.scrollHeight + "px";
        };
        container.appendChild(div);
    });
};

window.addItem = async () => {
    const input = document.getElementById('mainInput');
    if (!input.value.trim()) return;
    
    const newItem = mode === 'tasks' ? 
        { text: input.value, prio: document.getElementById('prioSelect').value, cat: document.getElementById('catSelect').value, timestamp: Date.now() } :
        { title: input.value, content: "", timestamp: Date.now() };

    await addDoc(collection(db, mode), newItem);
    input.value = '';
};

window.saveEdit = async (id, val) => {
    const docRef = doc(db, mode, id);
    await updateDoc(docRef, mode === 'tasks' ? { text: val } : { title: val });
};

window.updateNote = async (id, val) => {
    const docRef = doc(db, 'notes', id);
    await updateDoc(docRef, { content: val });
};

window.removeItem = async (id) => {
    await deleteDoc(doc(db, mode, id));
};

startSync();