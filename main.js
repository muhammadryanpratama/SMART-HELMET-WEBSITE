/* =========================================
   SMART FLEET - BOOT SEQUENCER
   ========================================= */

// Ambil elemen dari HTML
const boot = document.getElementById("boot");
const progress = document.getElementById("bootProgress");
const text = document.getElementById("bootText");
const welcome = document.getElementById("welcome");
const btn = document.getElementById("enterBtn");

// Sequence Pesan Loading ala Film Sci-Fi
const messages = [
  "INITIALIZING SECURE PROTOCOLS...",
  "CONNECTING TO FLEET SATELLITE...",
  "DECRYPTING WORKER DATA...",
  "ACCESS GRANTED. SYSTEM READY."
];

let value = 0;
let msgIndex = 0;

/* =========================================
   ANIMATION LOGIC
   ========================================= */
const interval = setInterval(() => {
  // Tambah progress bar random biar terlihat realistis
  value += Math.random() * 2 + 1; 
  if (value > 100) value = 100;

  // Update lebar bar
  progress.style.width = value + "%";

  // Ganti teks pesan setiap progress nambah 25%
  if (value > (msgIndex + 1) * 25 && msgIndex < messages.length - 1) {
    msgIndex++;
    text.innerText = messages[msgIndex];
  }

  // Jika Loading Selesai (100%)
  if (value >= 100) {
    clearInterval(interval);
    
    setTimeout(() => {
      // 1. Hilangkan Boot Screen
      boot.style.transition = "opacity 0.8s ease";
      boot.style.opacity = "0";
      
      setTimeout(() => {
        boot.style.display = "none";
        
        // 2. Munculkan Welcome Card
        welcome.classList.remove("hidden");
        // Tambahkan animasi masuk
        welcome.style.animation = "float 6s ease-in-out infinite, fadeIn 1s forwards";
      }, 800);
      
    }, 500);
  }
}, 50); // Kecepatan loading (makin kecil makin ngebut)

/* =========================================
   BUTTON ACTION
   ========================================= */
if (btn) {
  btn.addEventListener("click", () => {
    // Efek visual saat tombol ditekan
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> LOADING DASHBOARD...';
    btn.style.opacity = "0.8";
    
    // Transisi pindah halaman
    document.body.style.transition = "opacity 0.8s";
    document.body.style.opacity = "0";

    setTimeout(() => {
      // REDIRECT KE DASHBOARD
      window.location.href = "dashboard.html"; 
    }, 1000);
  });
}