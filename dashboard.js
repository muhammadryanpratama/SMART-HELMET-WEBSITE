/* =========================================
   1. KONFIGURASI THINGSBOARD
   ========================================= */
const TB_HOST = "demo.thingsboard.io";
// UUID Device TESTIMONI (Sesuai Screenshot Kamu)
const TARGET_DEVICE_ID = "34c48860-e4c9-11f0-aedf-65a2559b1d36"; 
const REAL_WORKER_ID = "W-000"; 

/* =========================================
   2. CONFIG & STATE
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
let activeDetailId = null;
let workerCounter = 101; 

// Ambil Token Login
const userJwtToken = localStorage.getItem('tb_token');

/* =========================================
   3. INIT (PERBAIKAN ANTI-STUCK)
   ========================================= */
window.onload = () => {
    // FORCE REMOVE LOADER (Biar gak stuck loading apapun yang terjadi)
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = 'none';
    document.body.classList.add('fade-in');

    // 1. Cek Login
    if (!userJwtToken) {
        alert("⚠️ ACCESS DENIED: Kamu belum login! Redirecting to login page...");
        window.location.href = "index.html"; 
        return;
    }

    // 2. Load Data Awal
    loadData(); 
    
    // 3. Tarik Data Real dari ThingsBoard
    fetchRealData(); 
    setInterval(fetchRealData, 2000); // Update tiap 2 detik

    // 4. Setup UI
    applyFilterAndSort(); 
    initSysBattery();
    initWeather();
    
    // 5. Jalankan Simulasi & Jam
    setInterval(tickSimulation, 1500); 
    setInterval(updateClock, 1000);
    
    // 6. Listener Search
    const searchIn = document.getElementById('searchInput');
    if(searchIn) searchIn.addEventListener('input', applyFilterAndSort);
};

/* =========================================
   4. CORE: TARIK DATA ASLI (HTTP FETCH)
   ========================================= */
async function fetchRealData() {
    try {
        const endTs = Date.now();
        const startTs = endTs - (24 * 60 * 60 * 1000); 
        
        // Request HTTP (Mencakup typo 'tempreture' kamu)
        const url = `https://${TB_HOST}/api/plugins/telemetry/DEVICE/${TARGET_DEVICE_ID}/values/timeseries?keys=temperature,tempreture,batteryLevel,battery,latitude,longitude&startTs=${startTs}&endTs=${endTs}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Authorization': `Bearer ${userJwtToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateRealWorkerUI(data);
        }
    } catch (e) {
        console.error("Connection Error:", e);
    }
}

function updateRealWorkerUI(data) {
    const worker = state.workers.find(w => w.id === REAL_WORKER_ID);
    if (!worker) return;

    // --- MAPPING DATA ---
    let valTemp = null;
    
    // Cek Typo 'tempreture' dulu (Prioritas)
    if (data.tempreture && data.tempreture.length > 0) {
        valTemp = data.tempreture[0].value;
    } else if (data.temperature && data.temperature.length > 0) {
        valTemp = data.temperature[0].value;
    }

    if (valTemp !== null) worker.temp = parseFloat(valTemp).toFixed(1);

    let valBatt = null;
    if (data.batteryLevel && data.batteryLevel.length > 0) {
        valBatt = data.batteryLevel[0].value;
    } else if (data.battery && data.battery.length > 0) {
        valBatt = data.battery[0].value;
    }

    if (valBatt !== null) worker.batt = Math.round(valBatt);

    // Update Status
    worker.status = 'NORMAL';
    if (worker.temp > 40) worker.status = 'CRITICAL';
    else if (worker.temp > 37.5) worker.status = 'WARNING';

    worker.name = "Tengku Arya (ONLINE)";
    
    // History
    worker.history.push(worker.temp);
    if(worker.history.length > 20) worker.history.shift();

    // Refresh Grid
    if (state.view === 'GRID') updateCardUI(worker);
    
    // Refresh Stats & Modal
    updateStats();
    if(activeDetailId === REAL_WORKER_ID) updateDetailModal();
}

/* =========================================
   5. DATA GENERATOR (DUMMY & REAL)
   ========================================= */
function loadData() {
    state.workers = [];
    // REAL WORKER
    state.workers.push({
        id: REAL_WORKER_ID, name: "Tengku Arya (Connecting...)",
        temp: "--", batt: 0, lat: -6.9744, lng: 107.6303,
        status: 'NORMAL', history: [], isReal: true
    });

    // DUMMY WORKERS
    for (let i = 1; i < 100; i++) {
        state.workers.push({
            id: `W-${String(i).padStart(3,'0')}`,
            name: `${NAMES_FIRST[i%NAMES_FIRST.length]} ${NAMES_LAST[i%NAMES_LAST.length]}`,
            temp: (36 + Math.random()).toFixed(1),
            batt: Math.floor(60 + Math.random() * 40),
            lat: -6.9744 + (Math.random()-0.5)*0.01,
            lng: 107.6303 + (Math.random()-0.5)*0.01,
            status: 'NORMAL', history: [], isReal: false
        });
    }
}

/* =========================================
   6. SIMULATION LOGIC
   ========================================= */
function tickSimulation() {
    state.workers.forEach(w => {
        if(w.isReal) return; // Jangan sentuh data asli

        // Fluktuasi suhu
        let change = (Math.random() - 0.5) * 1.5; 
        let newTemp = parseFloat(w.temp) + change;
        w.temp = Math.max(34, Math.min(43, newTemp)).toFixed(1);

        // Update Status Dummy
        if (w.temp > 40) w.status = 'CRITICAL';
        else if (w.temp > 37.5) w.status = 'WARNING';
        else w.status = 'NORMAL';

        if (Math.random() > 0.98 && w.batt > 0) w.batt--;

        w.history.push(w.temp);
        if (w.history.length > 20) w.history.shift();
    });

    if (state.view === 'GRID') {
        const start = (state.page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        state.filtered.slice(start, end).forEach(w => updateCardUI(w));
    } else if (state.view === 'MAP' && mapMain) {
        updateMapMarkers();
    }
    
    updateStats(); 
}

function updateCardUI(w) {
    const card = document.getElementById(`card-${w.id}`);
    if (card) {
        card.className = `card ${w.status}`;
        
        const vt = document.getElementById(`vt-${w.id}`);
        if(vt) {
            vt.innerText = w.temp + '°C';
            vt.style.color = w.status === 'CRITICAL' ? '#ef4444' : (w.status === 'WARNING' ? '#f59e0b' : '#f8fafc');
        }
        
        const vb = document.getElementById(`vb-${w.id}`);
        if(vb) vb.innerText = w.batt + '%';

        const nameEl = card.querySelector('.card-name');
        if(nameEl && nameEl.innerText !== w.name) nameEl.innerText = w.name;
        
        if(w.isReal) {
             card.style.border = "2px solid #3b82f6";
             card.style.boxShadow = "0 0 15px rgba(59, 130, 246, 0.4)";
        }
    }
}

/* =========================================
   7. CORE UI FUNCTIONS
   ========================================= */
function updateStats() {
    const all = state.workers;
    const safe = all.filter(w => w.status === 'NORMAL').length;
    const warning = all.filter(w => w.status === 'WARNING').length;
    const critical = all.filter(w => w.status === 'CRITICAL').length;
    const total = all.length;

    if(document.getElementById('totalCount')) {
        document.getElementById('totalCount').innerText = total;
        document.getElementById('safeCount').innerText = safe;
        document.getElementById('warningCount').innerText = warning;
        document.getElementById('criticalCount').innerText = critical;
    }
}

function applyFilterAndSort() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    
    let result = state.workers.filter(w => {
        const matchesSearch = w.name.toLowerCase().includes(term) || w.id.toLowerCase().includes(term);
        const matchesType = state.filter === 'ALL' ? true : w.status === 'CRITICAL';
        return matchesSearch && matchesType;
    });
    
    result.sort((a, b) => {
        if(a.isReal) return -1;
        if(b.isReal) return 1;
        if (state.sort === 'ID_ASC') return a.id.localeCompare(b.id);
        if (state.sort === 'ID_DESC') return b.id.localeCompare(a.id);
        if (state.sort === 'NAME_ASC') return a.name.localeCompare(b.name);
        return 0;
    });

    state.filtered = result;
    state.page = 1;
    if (state.view === 'GRID') renderGrid();
    else if (mapMain) updateMapMarkers();
    updateStats();
}

function renderGrid() {
    const grid = document.getElementById('gridArea');
    if (!grid) return;
    grid.innerHTML = '';

    const start = (state.page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const items = state.filtered.slice(start, end);

    items.forEach((w, idx) => {
        const div = document.createElement('div');
        div.className = `card ${w.status}`;
        div.id = `card-${w.id}`;
        div.style.animationDelay = `${idx * 50}ms`;
        
        if(w.isReal) {
            div.style.border = "2px solid #3b82f6";
            div.style.boxShadow = "0 0 15px rgba(59, 130, 246, 0.4)";
        }
        
        div.onclick = (e) => {
            if(!e.target.closest('.btn-delete')) openDetailModal(w.id);
        };

        const tempColor = w.status === 'CRITICAL' ? '#ef4444' : (w.status === 'WARNING' ? '#f59e0b' : '#f8fafc');
        const battColor = w.batt < 20 ? '#ef4444' : '#10b981';

        div.innerHTML = `
            <div class="card-header">
                <span class="card-id">
                    ${w.id} 
                    ${w.isReal ? '<i class="fa-solid fa-wifi" style="color:var(--success); margin-left:5px;"></i>' : ''}
                </span>
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

/* =========================================
   8. MAPS & MODALS
   ========================================= */
function initMap() {
    mapMain = L.map('mainMap').setView([-6.9744, 107.6303], 15);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(mapMain);
    markerLayer = L.layerGroup().addTo(mapMain);
}

function updateMapMarkers() {
    if(!mapMain) return;
    markerLayer.clearLayers();
    state.filtered.forEach(w => {
        const color = w.status === 'CRITICAL' ? '#ef4444' : (w.status === 'WARNING' ? '#f59e0b' : '#10b981');
        const m = L.circleMarker([w.lat, w.lng], { radius: w.isReal?10:6, fillColor:color, color:'#fff', weight:2, fillOpacity:1 });
        m.bindPopup(`<b>${w.name}</b><br>${w.temp}°C`);
        markerLayer.addLayer(m);
    });
}

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
        data: { labels: Array(20).fill(''), datasets: [{ data: w.history, borderColor:'#3b82f6', tension:0.4, fill:true }] },
        options: { responsive: true, plugins: { legend: false }, scales: { x: { display: false } } }
    });

    if(mapDetail) mapDetail.remove();
    setTimeout(() => {
        mapDetail = L.map('detailMap').setView([w.lat, w.lng], 17);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(mapDetail);
        L.marker([w.lat, w.lng]).addTo(mapDetail);
        mapDetail.invalidateSize();
    }, 200);
}

function closeDetailModal() { document.getElementById('detailModal').classList.remove('open'); activeDetailId = null; }
function updateDetailModal() {
    if(!activeDetailId) return;
    const w = state.workers.find(x => x.id === activeDetailId);
    document.getElementById('mTemp').innerText = w.temp + '°C';
    document.getElementById('mBatt').innerText = w.batt + '%';
    if(chartInstance) { chartInstance.data.datasets[0].data = w.history; chartInstance.update('none'); }
}

/* =========================================
   9. HELPER FUNCTIONS
   ========================================= */
function handleSort() { state.sort = document.getElementById('sortSelect').value; applyFilterAndSort(); }
function setFilter(type) { state.filter = type; document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); document.querySelector(`[data-filter="${type}"]`).classList.add('active'); applyFilterAndSort(); }
function changePage(d) { const max = Math.ceil(state.filtered.length/ITEMS_PER_PAGE); if(state.page+d > 0 && state.page+d <= max) { state.page += d; renderGrid(); } }
function updatePagination() { document.getElementById('currPage').innerText = state.page; document.getElementById('totalPage').innerText = Math.ceil(state.filtered.length/ITEMS_PER_PAGE) || 1; }
function switchView(mode) { 
    state.view = mode; 
    document.getElementById('gridArea').style.display = mode==='GRID'?'grid':'none'; 
    document.getElementById('pagArea').style.display = mode==='GRID'?'flex':'none';
    document.getElementById('mapArea').className = mode==='MAP'?'map-container active':'map-container'; 
    if(mode==='MAP') { 
        if(!mapMain) initMap(); 
        else setTimeout(()=>mapMain.invalidateSize(), 100); 
        updateMapMarkers(); 
    } 
}
function openAddModal() { document.getElementById('addModal').classList.add('open'); }
function closeAddModal() { document.getElementById('addModal').classList.remove('open'); }
function submitNewWorker() { const name = document.getElementById('newWorkerName').value; if(name) { state.workers.splice(1, 0, { id: `W-${workerCounter++}`, name: name, temp: "36.5", batt: 100, lat: -6.9744, lng: 107.6303, status: 'NORMAL', history: [], isReal: false }); closeAddModal(); document.getElementById('newWorkerName').value = ''; applyFilterAndSort(); } }
function deleteWorker(id, event) { event.stopPropagation(); if(id === REAL_WORKER_ID) return alert("Cannot delete LIVE Device."); if(confirm('Remove?')) { state.workers = state.workers.filter(w=>w.id!==id); applyFilterAndSort(); } }
function openAbout() { document.getElementById('aboutModal').classList.add('open'); }
function closeAbout() { document.getElementById('aboutModal').classList.remove('open'); }
function updateClock() { document.getElementById('clock').innerText = new Date().toLocaleTimeString('en-GB'); }
function initWeather() { 
    const icons = ['fa-cloud-sun', 'fa-sun', 'fa-cloud-rain', 'fa-bolt'];
    setInterval(() => {
        const temp = Math.floor(22 + Math.random() * 8);
        const icon = icons[Math.floor(Math.random() * icons.length)];
        const wTemp = document.getElementById('weatherTemp');
        const wIcon = document.getElementById('weatherIcon');
        if(wTemp) wTemp.innerText = `${temp}°C`;
        if(wIcon) wIcon.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    }, 5000);
}
function initSysBattery() { 
    if('getBattery' in navigator) navigator.getBattery().then(b => {
        const el = document.getElementById('sysBatt');
        if(el) el.innerHTML = `<i class="fa-solid fa-plug"></i> ${Math.floor(b.level*100)}%`; 
    }); 
}
function toggleTheme() { document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'); }
function exportData() { alert('Exporting Data...'); }
function showMapPopup(w) { /* Popup Logic Already in updateMapMarkers */ }
function closeMapPopup() { document.getElementById('mapPopup').classList.remove('show'); }

// Safety Net: Force Remove Loader after 3 sec if still there
setTimeout(() => {
    const l = document.getElementById('loader');
    if(l && l.style.display !== 'none') l.style.display = 'none';
}, 3000);
