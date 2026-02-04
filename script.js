let mode = 'tasks';
let currentSort = 'new';

const patterns = {
    tasks: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTUgMTBsNSA1IDEwLTEwIiBzdHJva2U9IiMzMDZBNjAiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==`,
    notes: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTEwIDMwTDMwIDEwIiBzdHJva2U9IiMzMDZBNjAiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==`
};

window.onload = () => render();

function setTab(m) {
    mode = m;
    document.getElementById('taskBtn').classList.toggle('active', mode === 'tasks');
    document.getElementById('noteBtn').classList.toggle('active', mode === 'notes');
    document.getElementById('prioSelect').style.display = mode === 'tasks' ? 'block' : 'none';
    document.getElementById('catSelect').style.display = mode === 'tasks' ? 'block' : 'none';
    document.getElementById('filterBar').style.display = mode === 'tasks' ? 'flex' : 'none';
    document.getElementById('mainInput').placeholder = mode === 'tasks' ? "Nieuwe taak..." : "Nieuw notitieboekje...";
    render();
}

function setSort(s) {
    currentSort = s;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(s));
    });
    render();
}

function render() {
    document.getElementById('pattern-layer').style.backgroundImage = `url(${patterns[mode]})`;
    const container = document.getElementById('list-container');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    container.innerHTML = '';
    
    let rawData = JSON.parse(localStorage.getItem('semthing_db_' + mode)) || [];
    let dataToRender = [...rawData];

    // 1. Zoekfilter
    if (searchTerm) {
        dataToRender = dataToRender.filter(item => {
            const text = mode === 'tasks' ? item.text : item.title;
            return text.toLowerCase().includes(searchTerm);
        });
    }

    // 2. Sorteren
    if (mode === 'tasks') {
        if (currentSort === 'alpha') dataToRender.sort((a, b) => a.text.localeCompare(b.text));
        else if (currentSort === 'prio') dataToRender.sort((a, b) => a.prio - b.prio);
        else dataToRender.reverse(); 
    } else {
        dataToRender.reverse();
    }

    dataToRender.forEach((item) => {
        // Vind de index in de originele array voor opslag
        const realIndex = rawData.findIndex(d => 
            mode === 'tasks' ? (d.text === item.text && d.prio === item.prio) : (d.title === item.title)
        );

        const div = document.createElement('div');
        div.className = `menu-item ${mode === 'tasks' ? 'prio-' + item.prio : ''}`;
        
        if (mode === 'tasks') {
            div.innerHTML = `
                <div class="menu-header">
                    <span class="editable-title" contenteditable="true" onblur="saveInlineEdit(${realIndex}, this.innerText)">${item.text}</span>
                    <small>${item.cat} | P${item.prio}</small>
                </div>
                <div class="menu-content"><div class="menu-inner">
                    <button class="btn-del" onclick="removeItem(${realIndex})">VERWIJDER TAAK</button>
                </div></div>`;
        } else {
            div.innerHTML = `
                <div class="menu-header">
                    <span class="editable-title" contenteditable="true" onblur="saveInlineEdit(${realIndex}, this.innerText)">${item.title}</span>
                </div>
                <div class="menu-content"><div class="menu-inner">
                    <textarea class="note-area" oninput="updateNote(${realIndex}, this.value)" placeholder="Begin met schrijven...">${item.content || ''}</textarea>
                    <button class="btn-del" onclick="removeItem(${realIndex})">VERWIJDER NOTITIE</button>
                </div></div>`;
        }

        div.querySelector('.menu-header').onclick = function(e) {
            if(e.target.classList.contains('editable-title')) return;
            const content = this.nextElementSibling;
            const isOpen = content.style.maxHeight;
            document.querySelectorAll('.menu-content').forEach(c => c.style.maxHeight = null);
            content.style.maxHeight = isOpen ? null : content.scrollHeight + "px";
        };
        container.appendChild(div);
    });
}

document.getElementById('addBtn').onclick = () => {
    const input = document.getElementById('mainInput');
    if (!input.value.trim()) return;
    const data = JSON.parse(localStorage.getItem('semthing_db_' + mode)) || [];
    
    if (mode === 'tasks') {
        data.push({ 
            text: input.value, 
            prio: document.getElementById('prioSelect').value,
            cat: document.getElementById('catSelect').value 
        });
    } else {
        data.push({ title: input.value, content: "" });
    }
    
    localStorage.setItem('semthing_db_' + mode, JSON.stringify(data));
    input.value = '';
    render();
};

function saveInlineEdit(index, newValue) {
    let data = JSON.parse(localStorage.getItem('semthing_db_' + mode));
    if (mode === 'tasks') data[index].text = newValue;
    else data[index].title = newValue;
    localStorage.setItem('semthing_db_' + mode, JSON.stringify(data));
}

function updateNote(index, val) {
    let data = JSON.parse(localStorage.getItem('semthing_db_notes'));
    data[index].content = val;
    localStorage.setItem('semthing_db_notes', JSON.stringify(data));
}

function removeItem(index) {
    let data = JSON.parse(localStorage.getItem('semthing_db_' + mode));
    data.splice(index, 1);
    localStorage.setItem('semthing_db_' + mode, JSON.stringify(data));
    render();
}