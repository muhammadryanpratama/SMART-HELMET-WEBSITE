/* =========================================
   CONFIG & STATE
   ========================================= */
const ITEMS_PER_PAGE = 12;
const NAMES_FIRST = ["Budi", "Siti", "Agus", "Rina", "Dewi", "Eko", "Fajar", "Indah", "Joko", "Lestari", "Putri", "Reza", "Sari", "Tono", "Wahyu", "Yulia", "Dian", "Hendra", "Maya", "Rizky", "Aditya", "Bayu", "Citra", "Dimas", "Gita", "Hana", "Iman", "Kartika", "Lukman", "Nadia", "Oscar", "Pandu", "Qori", "Ratna", "Surya", "Tia", "Umar", "Vina", "Wulan", "Yoga", "Zainal"];
const NAMES_LAST = ["Santoso", "Wijaya", "Putri", "Pratama", "Hidayat", "Saputra", "Utami", "Kusuma", "Nugroho", "Wibowo", "Siregar", "Nasution", "Prameswari", "Setiawan", "Hakim", "Ramadhan", "Mulyadi", "Firmansyah", "Yuliana", "Rahmawati", "Susanto", "Gunawan", "Mahendra", "Wulandari", "Permana", "Kurniawan", "Suharto", "Hartono", "Salim", "Tanjung"];

let state = {
    workers: [],
    filtered: [],
    page: 1,
    filter: 'ALL',
    sort: 'ID_ASC',
    view: 'GRID'
};

let mapMain = null, mapDetail = null;
let markerLayer = null; 
let chartInstance = null;
let startTime = Date.now();
let workerCounter = 101; 

/* =========================================
   INIT
   ========================================= */
window.onload = () => {
    document.body.classList.add('fade-in');
    
    setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 1000);

    loadData(); // Load from LocalStorage if available
    applyFilterAndSort(); 
    
    initSysBattery();
    initWeather();
    
    setInterval(tickSimulation, 2000); 
    setInterval(updateClock, 1000);
};

/* =========================================
   DATA LOGIC (WITH PERSISTENCE)
   ========================================= */
function generateName() {
    return `${NAMES_FIRST[Math.floor(Math.random()*NAMES_FIRST.length)]} ${NAMES_LAST[Math.floor(Math.random()*NAMES_LAST.length)]}`;
}

function createWorker(idNum, nameOverride = null) {
    return {
        id: `W-${String(idNum).padStart(3, '0')}`,
        name: nameOverride || generateName(),
        temp: (36 + Math.random()).toFixed(1),
        batt: Math.floor(60 + Math.random() * 40),
        lat: -6.9744 + (Math.random() - 0.5) * 0.008, 
        lng: 107.6303 + (Math.random() - 0.5) * 0.008,
        status: 'NORMAL',
        history: []
    };
}

function loadData() {
    const saved = localStorage.getItem('fleetData');
    if (saved) {
        state.workers = JSON.parse(saved);
        // Find max ID to set counter
        state.workers.forEach(w => {
            const num = parseInt(w.id.split('-')[1]);
            if(num >= workerCounter) workerCounter = num + 1;
        });
    } else {
        initData(100);
    }
}

function initData(count) {
    for (let i = 1; i <= count; i++) {
        state.workers.push(createWorker(i));
    }
    saveData();
}

function saveData() {
    localStorage.setItem('fleetData', JSON.stringify(state.workers));
}

/* =========================================
   CORE FUNCTIONS
   ========================================= */
function applyFilterAndSort() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    
    let result = state.workers.filter(w => {
        const matchesSearch = w.name.toLowerCase().includes(term) || w.id.toLowerCase().includes(term);
        const matchesType = state.filter === 'ALL' ? true : w.status === 'CRITICAL';
        return matchesSearch && matchesType;
    });
    
    result.sort((a, b) => {
        if (state.sort === 'ID_ASC') return a.id.localeCompare(b.id);
        if (state.sort === 'ID_DESC') return b.id.localeCompare(a.id);
        if (state.sort === 'NAME_ASC') return a.name.localeCompare(b.name);
        if (state.sort === 'NAME_DESC') return b.name.localeCompare(a.name);
        return 0;
    });

    state.filtered = result;
    if (state.view === 'GRID') renderGrid();
    else if (mapMain) updateMapMarkers();
    updateStats();
}

function handleSort() {
    state.sort = document.getElementById('sortSelect').value;
    applyFilterAndSort();
}

// Add Modal Logic
function openAddModal() { document.getElementById('addModal').classList.add('open'); }
function closeAddModal() { document.getElementById('addModal').classList.remove('open'); }

function submitNewWorker() {
    const name = document.getElementById('newWorkerName').value;
    if(name) {
        state.workers.unshift(createWorker(workerCounter++, name));
        saveData();
        closeAddModal();
        document.getElementById('newWorkerName').value = '';
        applyFilterAndSort();
    }
}

function deleteWorker(id, event) {
    event.stopPropagation();
    if(confirm(`Remove Unit ${id} from fleet?`)) {
        const card = document.getElementById(`card-${id}`);
        if(card) {
            card.classList.add('removing');
            setTimeout(() => {
                state.workers = state.workers.filter(w => w.id !== id);
                saveData();
                applyFilterAndSort();
            }, 350); 
        } else {
            state.workers = state.workers.filter(w => w.id !== id);
            saveData();
            applyFilterAndSort();
        }
    }
}

/* =========================================
   SIMULATION LOOP
   ========================================= */
function tickSimulation() {
    state.workers.forEach(w => {
        let t = parseFloat(w.temp) + (Math.random() - 0.5);
        w.temp = Math.max(30, Math.min(45, t)).toFixed(1);

        if (w.temp > 40) w.status = 'CRITICAL';
        else if (w.temp > 38) w.status = 'WARNING';
        else w.status = 'NORMAL';

        if (Math.random() > 0.95 && w.batt > 0) w.batt--;
        
        // Drift
        w.lat += (Math.random()-0.5) * 0.00005;
        w.lng += (Math.random()-0.5) * 0.00005;

        w.history.push(w.temp);
        if (w.history.length > 20) w.history.shift();
    });

    if (state.view === 'GRID') updateGridValues();
    else if (state.view === 'MAP' && mapMain) updateMapMarkers();
    
    updateStats();
    if(document.getElementById('detailModal').classList.contains('open')) updateDetailModal();
}

/* =========================================
   GRID RENDERING
   ========================================= */
function renderGrid() {
    const grid = document.getElementById('gridArea');
    grid.innerHTML = '';

    const start = (state.page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const items = state.filtered.slice(start, end);

    items.forEach((w, idx) => {
        const div = document.createElement('div');
        div.className = `card ${w.status}`;
        div.id = `card-${w.id}`;
        div.style.animationDelay = `${idx * 50}ms`;
        
        div.onclick = (e) => {
            if(!e.target.closest('.btn-delete')) openDetailModal(w.id);
        };

        const tempColor = w.temp > 38 ? '#ef4444' : 'var(--text-main)';
        const battColor = w.batt < 20 ? '#ef4444' : '#10b981';

        div.innerHTML = `
            <div class="card-header">
                <span class="card-id">${w.id}</span>
                <button class="btn-delete" onclick="deleteWorker('${w.id}', event)"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="card-name">${w.name}</div>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-icon icon-temp"><i class="fa-solid fa-temperature-half"></i></div>
                    <div class="metric-info">
                        <span class="metric-val" id="vt-${w.id}" style="color:${tempColor}">${w.temp}°C</span>
                        <span class="metric-lbl">TEMP</span>
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-icon icon-batt"><i class="fa-solid fa-battery-bolt"></i></div>
                    <div class="metric-info">
                        <span class="metric-val" id="vb-${w.id}" style="color:${battColor}">${w.batt}%</span>
                        <span class="metric-lbl">BATT</span>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
    updatePagination();
}

function updateGridValues() {
    const start = (state.page - 1) * ITEMS_PER_PAGE;
    const items = state.filtered.slice(start, start + ITEMS_PER_PAGE);

    items.forEach(w => {
        const card = document.getElementById(`card-${w.id}`);
        if (card) {
            card.className = `card ${w.status}`;
            const vt = document.getElementById(`vt-${w.id}`);
            vt.innerText = w.temp + '°C';
            vt.style.color = w.temp > 38 ? '#ef4444' : 'var(--text-main)';
            const vb = document.getElementById(`vb-${w.id}`);
            vb.innerText = w.batt + '%';
            vb.style.color = w.batt < 20 ? '#ef4444' : '#10b981';
        }
    });
}

/* =========================================
   CONTROLS & MAP
   ========================================= */
function setFilter(type) {
    state.filter = type; state.page = 1;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-filter="${type}"]`).classList.add('active');
    applyFilterAndSort();
}
document.getElementById('searchInput').addEventListener('input', applyFilterAndSort);

function changePage(dir) {
    const max = Math.ceil(state.filtered.length / ITEMS_PER_PAGE);
    const next = state.page + dir;
    if (next > 0 && next <= max) {
        state.page = next;
        renderGrid();
    }
}

function updatePagination() {
    const total = state.filtered.length;
    const max = Math.ceil(total / ITEMS_PER_PAGE);
    document.getElementById('currPage').innerText = state.page;
    document.getElementById('totalPage').innerText = max || 1;
    document.getElementById('prevBtn').disabled = state.page === 1;
    document.getElementById('nextBtn').disabled = state.page === max || total === 0;
}

function switchView(mode) {
    state.view = mode;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(mode === 'GRID' ? 'btnGrid' : 'btnMap').classList.add('active');
    
    document.getElementById('gridArea').style.display = mode === 'GRID' ? 'grid' : 'none';
    document.getElementById('pagArea').style.display = mode === 'GRID' ? 'flex' : 'none';
    
    const mapArea = document.getElementById('mapArea');
    if (mode === 'MAP') {
        mapArea.classList.add('active');
        if (!mapMain) initMap();
        else setTimeout(() => mapMain.invalidateSize(), 100);
        updateMapMarkers();
    } else {
        mapArea.classList.remove('active');
    }
}

/* =========================================
   MAPS
   ========================================= */
function initMap() {
    mapMain = L.map('mainMap').setView([-6.9744, 107.6303], 15);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(mapMain);
    markerLayer = L.layerGroup().addTo(mapMain);
}

function updateMapMarkers() {
    if (!mapMain || !markerLayer) return;
    
    markerLayer.clearLayers();
    
    state.filtered.forEach(w => {
        const color = w.status === 'CRITICAL' ? '#ef4444' : (w.status === 'WARNING' ? '#f59e0b' : '#10b981');
        
        const m = L.circleMarker([w.lat, w.lng], { 
            radius: 6, fillColor: color, color: '#fff', weight: 2, fillOpacity: 1 
        });
        
        m.on('click', () => showMapPopup(w));
        markerLayer.addLayer(m);
    });
}

function showMapPopup(w) {
    const p = document.getElementById('mapPopup');
    p.classList.add('show');
    document.getElementById('mpId').innerText = w.id;
    document.getElementById('mpName').innerText = w.name;
    document.getElementById('mpTemp').innerText = w.temp + '°C';
    document.getElementById('mpBatt').innerText = w.batt + '%';
}
function closeMapPopup() { document.getElementById('mapPopup').classList.remove('show'); }

/* =========================================
   DETAIL MODAL
   ========================================= */
let activeDetailId = null;
function openDetailModal(id) {
    activeDetailId = id;
    const w = state.workers.find(x => x.id === id);
    document.getElementById('detailModal').classList.add('open');
    document.getElementById('mId').innerText = w.id;
    document.getElementById('mName').innerText = w.name;
    document.getElementById('mTemp').innerText = w.temp + '°C';
    document.getElementById('mBatt').innerText = w.batt + '%';

    if(chartInstance) chartInstance.destroy();
    const ctx = document.getElementById('mChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                data: w.history,
                borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0
            }]
        },
        options: { responsive: true, plugins: { legend: false }, scales: { x: { display: false } } }
    });

    if(mapDetail) mapDetail.remove();
    mapDetail = L.map('detailMap').setView([w.lat, w.lng], 16);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(mapDetail);
    L.marker([w.lat, w.lng]).addTo(mapDetail);
}

function closeDetailModal() { document.getElementById('detailModal').classList.remove('open'); activeDetailId = null; }

function updateDetailModal() {
    if(!activeDetailId) return;
    const w = state.workers.find(x => x.id === activeDetailId);
    if(w) {
        document.getElementById('mTemp').innerText = w.temp + '°C';
        document.getElementById('mBatt').innerText = w.batt + '%';
        if(chartInstance) { chartInstance.data.datasets[0].data = w.history; chartInstance.update('none'); }
    } else {
        closeDetailModal();
    }
}

/* =========================================
   UTILS (Weather, Export, Stats)
   ========================================= */
function openAbout() { document.getElementById('aboutModal').classList.add('open'); }
function closeAbout() { document.getElementById('aboutModal').classList.remove('open'); }

function updateStats() {
    const all = state.workers;
    document.getElementById('totalCount').innerText = all.length;
    document.getElementById('safeCount').innerText = all.filter(w => w.status === 'NORMAL').length;
    document.getElementById('warningCount').innerText = all.filter(w => w.status === 'WARNING').length;
    document.getElementById('criticalCount').innerText = all.filter(w => w.status === 'CRITICAL').length;
}

function updateClock() {
    document.getElementById('clock').innerText = new Date().toLocaleTimeString('en-GB');
}

function initWeather() {
    // Simulated Weather Logic
    const icons = ['fa-cloud-sun', 'fa-sun', 'fa-cloud-rain', 'fa-bolt'];
    setInterval(() => {
        const temp = Math.floor(22 + Math.random() * 8);
        const icon = icons[Math.floor(Math.random() * icons.length)];
        document.getElementById('weatherTemp').innerText = `${temp}°C`;
        document.getElementById('weatherIcon').innerHTML = `<i class="fa-solid ${icon}"></i>`;
    }, 5000);
}

function initSysBattery() {
    if('getBattery' in navigator) {
        navigator.getBattery().then(b => {
            const up = () => {
                const el = document.getElementById('sysBatt');
                const lev = Math.floor(b.level*100);
                el.innerHTML = `<i class="fa-solid ${b.charging?'fa-bolt':'fa-plug'}"></i> ${lev}%`;
                el.style.color = lev < 20 ? '#ef4444' : '#10b981';
            };
            up(); b.addEventListener('levelchange', up); b.addEventListener('chargingchange', up);
        });
    }
}

function toggleTheme() {
    const root = document.documentElement;
    root.setAttribute('data-theme', root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

function exportData() {
    let csv = "ID,Name,Temp,Batt,Status,Lat,Lng\n";
    state.workers.forEach(w => csv += `${w.id},${w.name},${w.temp},${w.batt},${w.status},${w.lat},${w.lng}\n`);
    const link = document.createElement("a"); link.href = "data:text/csv," + encodeURI(csv); link.download = "fleet_data.csv"; link.click();
}