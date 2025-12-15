function updateData() {
    let temp = 26.3;
    let hum = 31;
    let status = "CRITICAL"; // ganti ke WARNING / NORMAL buat tes
  
    document.getElementById("temp").innerText = temp;
    document.getElementById("hum").innerText = hum;
  
    let statusEl = document.getElementById("status");
    statusEl.innerText = status;
  
    // reset class
    statusEl.className = "status";
  
    if (status === "CRITICAL") {
      statusEl.classList.add("critical");
    } else if (status === "WARNING") {
      statusEl.classList.add("warning");
    } else {
      statusEl.classList.add("normal");
    }
  }
  
  updateData();
  setInterval(updateData, 5000);
  