// Konfigurasi Firebase - GANTI DENGAN KONFIGURASI ANDA SENDIRI
const firebaseConfig = {
  apiKey: "AIzaSyCdaQGQPzj6nwktNe2NVFTgA-DfbFySI3M",
  authDomain: "belt-conveyor-sorter.firebaseapp.com",
  databaseURL: "https://belt-conveyor-sorter-default-rtdb.firebaseio.com",
  projectId: "belt-conveyor-sorter",
  storageBucket: "belt-conveyor-sorter.firebasestorage.app",
  messagingSenderId: "80416165505",
  appId: "1:80416165505:web:f8dd580d6179bcc1fcc780",
  measurementId: "G-BN11PX6HCJ"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Variabel global
let items = [];
let conveyorStatus = false;
let itemsOnBelt = [];

// Elemen DOM
const conveyorBelt = document.getElementById('conveyor-belt');
const itemsTableBody = document.getElementById('items-table-body');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const connectionStatus = document.getElementById('connection-status');

// Statistik elements (HANYA 4)
const totalSortedElement = document.getElementById('total-sorted');
const merahSortedElement = document.getElementById('merah-sorted');
const biruSortedElement = document.getElementById('biru-sorted');
const kuningSortedElement = document.getElementById('kuning-sorted');

// Update status koneksi Firebase
const connectedRef = database.ref(".info/connected");
connectedRef.on("value", function(snap) {
    if (snap.val() === true) {
        connectionStatus.innerHTML = '<i class="fas fa-circle" style="color: #27ae60;"></i> Terhubung ke Firebase';
        console.log("Terhubung ke Firebase");
    } else {
        connectionStatus.innerHTML = '<i class="fas fa-circle" style="color: #e74c3c;"></i> Terputus dari Firebase';
        console.log("Terputus dari Firebase");
    }
});

// Mengambil data dari Firebase
function fetchData() {
    // Mendengarkan perubahan pada data items
    database.ref('items').on('value', (snapshot) => {
        items = [];
        const data = snapshot.val();
        
        if (data) {
            // Konversi objek ke array
            for (let id in data) {
                items.push({
                    id: id,
                    ...data[id]
                });
            }
            
            // Urutkan berdasarkan timestamp (terbaru pertama)
            items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Update tabel
            updateItemsTable();
            
            // Update conveyor belt
            updateConveyorBelt();
        } else {
            // Jika tidak ada data, kosongkan tampilan
            itemsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Belum ada data barang</td></tr>';
            conveyorBelt.innerHTML = '';
            itemsOnBelt = [];
        }
    });
    
    // Mendengarkan perubahan pada data statistik
    database.ref('statistics').on('value', (snapshot) => {
        const stats = snapshot.val();
        
        if (stats) {
            totalSortedElement.textContent = stats.totalSorted || 0;
            merahSortedElement.textContent = stats.merahSorted || 0;
            biruSortedElement.textContent = stats.biruSorted || 0;
            kuningSortedElement.textContent = stats.kuningSorted || 0;
        } else {
            // Jika tidak ada statistik, set ke 0
            totalSortedElement.textContent = 0;
            merahSortedElement.textContent = 0;
            biruSortedElement.textContent = 0;
            kuningSortedElement.textContent = 0;
        }
    });
    
    // Mendengarkan perubahan pada status conveyor
    database.ref('conveyor').on('value', (snapshot) => {
        const conveyor = snapshot.val();
        
        if (conveyor) {
            conveyorStatus = conveyor.isRunning || false;
            updateConveyorStatus();
        } else {
            // Jika tidak ada data conveyor, set default
            conveyorStatus = false;
            updateConveyorStatus();
        }
    });
}

// Update tampilan conveyor belt
function updateConveyorBelt() {
    conveyorBelt.innerHTML = '';
    itemsOnBelt = items.filter(item => !item.sorted);
    
    // Tampilkan maksimal 5 item di conveyor
    const itemsToShow = itemsOnBelt.slice(0, 5);
    
    if (itemsToShow.length === 0) {
        // Jika tidak ada item di conveyor
        const emptyMessage = document.createElement('div');
        emptyMessage.textContent = 'Tidak ada barang di conveyor';
        emptyMessage.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #666;
            font-style: italic;
        `;
        conveyorBelt.appendChild(emptyMessage);
        return;
    }
    
    itemsToShow.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = `item ${item.color} ${index === 0 ? 'new' : ''}`;
        itemElement.id = `item-${item.id}`;
        itemElement.textContent = item.color.charAt(0).toUpperCase();
        
        // Hitung posisi berdasarkan indeks
        const position = (index + 1) * 15; // Persentase dari kiri
        itemElement.style.left = `${position}%`;
        
        // Tambah tooltip
        itemElement.title = `Barang ${item.color} (${item.id})`;
        
        conveyorBelt.appendChild(itemElement);
    });
}

// Update tabel items
function updateItemsTable() {
    itemsTableBody.innerHTML = '';
    
    if (items.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" style="text-align: center;">Belum ada data barang</td>';
        itemsTableBody.appendChild(row);
        return;
    }
    
    // Tampilkan maksimal 10 item terbaru
    const itemsToShow = items.slice(0, 10);
    
    itemsToShow.forEach(item => {
        const row = document.createElement('tr');
        
        // Format tanggal
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleString('id-ID');
        
        // Tentukan badge warna
        let colorBadgeClass = '';
        if (item.color === 'merah') colorBadgeClass = 'badge-merah';
        if (item.color === 'biru') colorBadgeClass = 'badge-biru';
        if (item.color === 'kuning') colorBadgeClass = 'badge-kuning';
        
        row.innerHTML = `
            <td>${item.id}</td>
            <td><span class="color-badge ${colorBadgeClass}">${item.color.toUpperCase()}</span></td>
            <td>${formattedDate}</td>
            <td class="${item.sorted ? 'status-sorted' : 'status-unsorted'}">
                ${item.sorted ? 'Telah Dipilah' : 'Belum Dipilah'}
            </td>
            <td>${item.sorted ? item.position : 'Dalam proses'}</td>
        `;
        
        itemsTableBody.appendChild(row);
    });
}

// Update status conveyor
function updateConveyorStatus() {
    if (conveyorStatus) {
        statusDot.className = 'status-dot status-running';
        statusText.textContent = 'Conveyor Berjalan';
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } else {
        statusDot.className = 'status-dot status-stopped';
        statusText.textContent = 'Conveyor Berhenti';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
}

// Fungsi untuk memulai conveyor
function startConveyor() {
    database.ref('conveyor').update({
        isRunning: true
    })
    .then(() => {
        console.log("Conveyor started successfully");
        showNotification('Conveyor mulai berjalan!');
    })
    .catch(error => {
        console.error("Error starting conveyor:", error);
        showNotification("Gagal memulai conveyor. Coba lagi.");
    });
}

// Fungsi untuk menghentikan conveyor
function stopConveyor() {
    database.ref('conveyor').update({
        isRunning: false
    })
    .then(() => {
        console.log("Conveyor stopped successfully");
        showNotification('Conveyor dihentikan!');
    })
    .catch(error => {
        console.error("Error stopping conveyor:", error);
        showNotification("Gagal menghentikan conveyor. Coba lagi.");
    });
}

// Fungsi untuk mereset data
function resetData() {
    if (confirm('Apakah Anda yakin ingin mereset semua data? Tindakan ini tidak dapat dibatalkan.')) {
        console.log("Resetting all data...");
        
        // Reset statistik (HAPUS currentOnBelt)
        const defaultStats = {
            totalSorted: 0,
            merahSorted: 0,
            biruSorted: 0,
            kuningSorted: 0
        };
        
        // Reset conveyor status
        const defaultConveyor = {
            isRunning: false
        };
        
        // Hapus semua items
        database.ref('items').remove()
            .then(() => {
                console.log("Items removed successfully");
                return database.ref('statistics').set(defaultStats);
            })
            .then(() => {
                console.log("Statistics reset successfully");
                return database.ref('conveyor').set(defaultConveyor);
            })
            .then(() => {
                console.log("Conveyor settings reset successfully");
                showNotification('Semua data telah direset!');
            })
            .catch(error => {
                console.error("Error resetting data:", error);
                showNotification("Gagal mereset data. Coba lagi.");
            });
    }
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message) {
    // Buat elemen notifikasi
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        display: flex;
        align-items: center;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-info-circle" style="margin-right: 10px;"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Tambahkan animasi CSS jika belum ada
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Hapus notifikasi setelah 3 detik
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Simulasi proses pemilahan (untuk demo)
function simulateSorting() {
    if (conveyorStatus && itemsOnBelt.length > 0) {
        // Ambil item pertama yang belum dipilah
        const itemToSort = itemsOnBelt[0];
        
        if (itemToSort) {
            console.log(`Memilah item: ${itemToSort.id} (${itemToSort.color})`);
            
            // Update item menjadi sudah dipilah
            database.ref('items/' + itemToSort.id).update({
                sorted: true,
                position: Math.floor(Math.random() * 3) + 1 // Posisi 1-3
            })
            .then(() => {
                // Update statistik (HAPUS currentOnBelt)
                return database.ref('statistics').once('value');
            })
            .then((snapshot) => {
                const stats = snapshot.val() || {
                    totalSorted: 0,
                    merahSorted: 0,
                    biruSorted: 0,
                    kuningSorted: 0
                };
                
                stats.totalSorted = (stats.totalSorted || 0) + 1;
                
                // Tambahkan ke statistik warna
                if (itemToSort.color === 'merah') {
                    stats.merahSorted = (stats.merahSorted || 0) + 1;
                } else if (itemToSort.color === 'biru') {
                    stats.biruSorted = (stats.biruSorted || 0) + 1;
                } else if (itemToSort.color === 'kuning') {
                    stats.kuningSorted = (stats.kuningSorted || 0) + 1;
                }
                
                return database.ref('statistics').update(stats);
            })
            .then(() => {
                console.log("Item berhasil dipilah dan statistik diperbarui");
                showNotification(`Barang ${itemToSort.color} berhasil dipilah!`);
            })
            .catch(error => {
                console.error("Error during sorting simulation:", error);
            });
        }
    }
}

// Event listeners
startBtn.addEventListener('click', startConveyor);
stopBtn.addEventListener('click', stopConveyor);
resetBtn.addEventListener('click', resetData);

// Inisialisasi aplikasi
function initApp() {
    console.log("Menginisialisasi aplikasi...");
    
    // Cek apakah Firebase sudah terinisialisasi
    if (!firebase.apps.length) {
        console.error("Firebase belum terinisialisasi!");
        showNotification("Error: Firebase belum terinisialisasi. Periksa konfigurasi.");
        return;
    }
    
    fetchData();
    updateConveyorStatus();
    
    // Simulasi pemilahan setiap 5 detik jika conveyor berjalan
    setInterval(() => {
        if (conveyorStatus) {
            simulateSorting();
        }
    }, 5000);
    
    console.log("Aplikasi siap digunakan!");
}

// Jalankan aplikasi ketika halaman siap
document.addEventListener('DOMContentLoaded', initApp);