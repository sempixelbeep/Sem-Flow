import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, getDoc, setDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- VERVANG DEZE MET JE EIGEN CONFIG ---
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
let currentPoints = 0;
let undoTimer = null;
let lastCompletedId = null;

// --- INITIALISATIE ---
if (Notification.permission !== "granted") Notification.requestPermission();

async function loadPoints() {
    const docRef = doc(db, 'settings', 'user');
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            currentPoints = snap.data().points || 0;
        } else {
            await setDoc(docRef, { points: 0 });
        }
        updatePointsUI();
    } catch(e) {
        console.log("Eerste keer start: nog geen settings doc.");
    }
}
loadPoints();

function updatePointsUI() {
    document.getElementById('pointsDisplay').innerText = currentPoints;
}

// Check elke 30 sec voor meldingen
setInterval(() => {
    const now = new Date();
    const timeString = now.toISOString().slice(0, 16); 
    cloudData.forEach(item => {
        if(item.notifyAt === timeString && !item.completed) {
            new Notification("Sem Flow", { body: item.text ? item.text.replace(/<[^>]*>/g, '') : "Herinnering!" }); // Strip HTML voor melding
            if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        }
    });
}, 30000);

// --- BASIS FUNCTIES ---
window.toggleTheme = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('semTheme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
};
if(localStorage.getItem('semTheme') === 'dark') document.body.classList.add('dark-mode');

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
    document.getElementById('progressBar').style.width = perc + "%";
}

// --- RENDER LOGICA ---
window.render = () => {
    const container = document.getElementById('list-container');
    container.innerHTML = '';
    
    cloudData.forEach((item) => {
        if (item.completed && mode === 'tasks') return; 

        const div = document.createElement('div');
        div.className = `menu-item ${mode === 'tasks' ? 'prio-' + item.prio : ''}`;
        div.setAttribute('data-id', item.id);
        
        let contentHTML = '';
        
        // DE NIEUWE TOOLBAR HTML
        const toolbarHTML = `
            <div class="format-toolbar">
                <button class="fmt-btn fmt-sans" onmousedown="event.preventDefault(); window.execCmd('formatBlock', 'H3')">H1</button>
                <button class="fmt-btn fmt-sans" onmousedown="event.preventDefault(); window.execCmd('formatBlock', 'H4')">H2</button>
                <button class="fmt-btn" style="font-size:14px" onmousedown="event.preventDefault(); window.execCmd('removeFormat')">Aa</button>
                <div style="width:1px; background:#555; margin:0 5px;"></div>
                <button class="fmt-btn" onmousedown="event.preventDefault(); window.execCmd('bold')">B</button>
                <button class="fmt-btn" style="font-style:italic" onmousedown="event.preventDefault(); window.execCmd('italic')">I</button>
                <button class="fmt-btn" style="text-decoration:underline" onmousedown="event.preventDefault(); window.execCmd('underline')">U</button>
            </div>
        `;

        if (mode === 'tasks') {
            contentHTML = `
            <div class="menu-header" onclick="window.toggleMenu('${item.id}')">
                <input type="checkbox" style="margin-right:10px;" onclick="event.stopPropagation(); window.completeTask('${item.id}', '${item.prio}')">
                <div class="item-text" contenteditable="true" 
                     onblur="window.saveEdit('${item.id}', this.innerHTML)" 
                     onclick="event.stopPropagation()">${item.text}</div> <small class="cat-tag">${item.cat}</small>
            </div>
            <div class="menu-content" id="menu-${item.id}">
                <div class="menu-inner">
                    ${toolbarHTML} <div class="action-grid">
                         <button class="action-btn btn-opt" onclick="window.changePrio('${item.id}')">Prioriteit</button>
                         <button class="action-btn btn-opt" onclick="window.toggleRepeat('${item.id}')">${item.repeat ? 'Herhaal: AAN' : 'Herhaal: UIT'}</button>
                         <div style="grid-column: span 2; margin-top:5px;">
                            <input type="datetime-local" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ddd;" 
                                   value="${item.notifyAt || ''}" onchange="window.setNotification('${item.id}', this.value)">
                        </div>
                        <button class="action-btn btn-del" onclick="window.removeItem('${item.id}')">Verwijderen</button>
                    </div>
                </div>
            </div>`;
        } else {
            // Notities logic...
             contentHTML = `
            <div class="menu-header" onclick="window.toggleMenu('${item.id}')">
                <span class="item-text" contenteditable="true" onblur="window.saveEdit('${item.id}', this.innerText)">${item.title}</span>
            </div>
            <div class="menu-content" id="menu-${item.id}">
                <div class="menu-inner">
                    <textarea class="note-area" oninput="window.updateNote('${item.id}', this.value)">${item.content || ''}</textarea>
                    <button class="action-btn btn-del" onclick="window.removeItem('${item.id}')">Verwijderen</button>
                </div>
            </div>`;
        }

        div.innerHTML = contentHTML;
        
        // Fix voor enter toets in taken (voorkom nieuwe div)
        const editable = div.querySelector('[contenteditable]');
        if(editable) {
            editable.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    editable.blur(); // Opslaan
                }
            });
        }

        container.appendChild(div);
    });
};

window.toggleMenu = (id) => {
    const content = document.getElementById(`menu-${id}`);
    const isOpen = content.style.maxHeight;
    document.querySelectorAll('.menu-content').forEach(c => c.style.maxHeight = null);
    if (!isOpen) content.style.maxHeight = content.scrollHeight + 100 + "px"; // Extra ruimte voor toolbar
};

// --- RICH TEXT FUNCTIE ---
// Dit voert commando's uit op de geselecteerde tekst in de contenteditable
window.execCmd = (command, value = null) => {
    document.execCommand(command, false, value);
};

// --- ACTIES ---
window.addItem = async () => {
    const input = document.getElementById('mainInput');
    if (!input.value.trim()) return;
    
    const newItem = mode === 'tasks' ? 
        { 
            text: input.value, // Start als platte tekst
            prio: document.getElementById('prioSelect').value, 
            cat: document.getElementById('catSelect').value, 
            completed: false, 
            timestamp: Date.now(),
            repeat: false,
            notifyAt: null
        } :
        { title: input.value, content: "", timestamp: Date.now() };

    await addDoc(collection(db, mode), newItem);
    input.value = '';
    input.focus();
};

window.saveEdit = async (id, htmlContent) => {
    // We slaan nu HTML op (dus <b>tekst</b> wordt bewaard)
    await updateDoc(doc(db, mode, id), mode === 'tasks' ? { text: htmlContent } : { title: htmlContent });
};

window.completeTask = async (id, prio) => {
    triggerFireworks();
    if ("vibrate" in navigator) navigator.vibrate(100);

    const pointsMap = { '1': 100, '2': 90, '3': 70 };
    const earned = pointsMap[prio] || 50;
    
    // Optimistische UI update (meteen verwijderen uit zicht)
    const itemEl = document.querySelector(`[data-id="${id}"]`);
    if(itemEl) itemEl.style.display = 'none';

    await updateDoc(doc(db, 'tasks', id), { completed: true });
    
    currentPoints += earned;
    updatePointsUI();
    updateDoc(doc(db, 'settings', 'user'), { points: currentPoints });

    showToast(id, earned);
};

function showToast(id, points) {
    const toast = document.getElementById('toast');
    document.getElementById('toastPoints').innerText = points;
    toast.classList.remove('hidden');
    lastCompletedId = { id, points };

    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
        toast.classList.add('hidden');
        lastCompletedId = null;
    }, 5000);
}

window.undoComplete = async () => {
    if (!lastCompletedId) return;
    
    currentPoints -= lastCompletedId.points;
    updatePointsUI();
    updateDoc(doc(db, 'settings', 'user'), { points: currentPoints });

    await updateDoc(doc(db, 'tasks', lastCompletedId.id), { completed: false });
    
    document.getElementById('toast').classList.add('hidden');
    startSync(); // Forceer reload om item terug te tonen
};

window.removeItem = async (id) => {
    if(confirm("Verwijderen?")) {
        await deleteDoc(doc(db, mode, id));
    }
};

window.changePrio = async (id) => {
    const newPrio = prompt("Nieuwe prioriteit (1, 2 of 3):");
    if(['1','2','3'].includes(newPrio)) {
        await updateDoc(doc(db, 'tasks', id), { prio: newPrio });
    }
};

window.toggleRepeat = async (id) => {
    const item = cloudData.find(i => i.id === id);
    await updateDoc(doc(db, 'tasks', id), { repeat: !item.repeat });
};

window.updateNote = async (id, val) => {
    await updateDoc(doc(db, 'notes', id), { content: val });
};

window.setNotification = async (id, dateStr) => {
    await updateDoc(doc(db, 'tasks', id), { notifyAt: dateStr });
};

// Vuurwerk
function triggerFireworks() {
    const container = document.getElementById('fireworks-container');
    const colors = ['#ff4757', '#2ecc71', '#3498db', '#f1c40f'];
    
    for(let i=0; i<30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.backgroundColor = colors[Math.floor(Math.random()*colors.length)];
        p.style.left = '50%';
        p.style.top = '50%';
        p.style.setProperty('--tx', (Math.random()*200 - 100) + 'px');
        p.style.setProperty('--ty', (Math.random()*200 - 100) + 'px');
        container.appendChild(p);
        setTimeout(() => p.remove(), 1000);
    }
}

// Enter Key
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.id === 'mainInput') window.addItem();
});
  
