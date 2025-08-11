const nameInput = document.getElementById("name");
const resultsList = document.getElementById("results");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");

let scans = JSON.parse(localStorage.getItem("qr_scans") || "[]");
renderResults();

function isURL(text) {
  return /^(https?:\/\/[^\s]+)$/i.test(text.trim());
}

function isContactData(text) {
  return /^BEGIN:VCARD/i.test(text) || /^MECARD:/i.test(text);
}

function parseContact(text) {
  let contact = {};
  if (/^BEGIN:VCARD/i.test(text)) {
    text.split(/\r?\n/).forEach(line => {
      if (line.startsWith("FN:")) contact.name = line.substring(3);
      if (line.startsWith("TEL:")) contact.phone = line.substring(4);
      if (line.startsWith("EMAIL:")) contact.email = line.substring(6);
    });
  } else if (/^MECARD:/i.test(text)) {
    let parts = text.substring(7).split(";");
    parts.forEach(p => {
      if (p.startsWith("N:")) contact.name = p.substring(2);
      if (p.startsWith("TEL:")) contact.phone = p.substring(4);
      if (p.startsWith("EMAIL:")) contact.email = p.substring(6);
    });
  }
  return contact;
}

function onScanSuccess(decodedText) {
  const name = nameInput.value.trim() || "Anonymous";
  const entry = {
    name,
    text: decodedText,
    timestamp: new Date().toISOString()
  };

  if (scans.length && scans[0].text === entry.text) return;

  scans.unshift(entry);
  localStorage.setItem("qr_scans", JSON.stringify(scans));
  renderResults();

  if (isURL(decodedText)) {
    if (confirm(`Open this link?\n${decodedText}`)) {
      window.open(decodedText, "_blank");
    }
  }
}

function onScanFailure() {}

const html5QrcodeScanner = new Html5QrcodeScanner(
  "reader",
  { fps: 10, qrbox: 250 },
  false
);
html5QrcodeScanner.render(onScanSuccess, onScanFailure);

function renderResults() {
  resultsList.innerHTML = "";
  scans.forEach(scan => {
    const li = document.createElement("li");

    const ts = document.createElement("div");
    ts.textContent = `[${new Date(scan.timestamp).toLocaleString()}] ${scan.name}:`;
    ts.style.fontSize = "0.85em";
    ts.style.color = "#666";

    const content = document.createElement("div");
    const text = scan.text;

    if (isURL(text)) {
      const a = document.createElement("a");
      a.href = text;
      a.textContent = text;
      a.target = "_blank";
      content.appendChild(a);
    } else if (isContactData(text)) {
      const c = parseContact(text);
      content.innerHTML = `<strong>${c.name || "Unknown"}</strong><br>
        ${c.phone || ""}<br>
        ${c.email || ""}`;
    } else {
      content.textContent = text;
    }

    li.appendChild(ts);
    li.appendChild(content);
    resultsList.appendChild(li);
  });
}

exportBtn.addEventListener("click", () => {
  if (!scans.length) {
    alert("No scans to export.");
    return;
  }
  const header = "timestamp,name,text\n";
  const rows = scans
    .slice()
    .reverse()
    .map(s => 
      `${s.timestamp},"${s.name.replace(/"/g, '""')}","${s.text.replace(/"/g, '""')}"`
    )
    .join("\n");

  const csv = header + rows;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qr_scans_${new Date().toISOString()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

clearBtn.addEventListener("click", () => {
  if (confirm("Clear all saved scans? This cannot be undone.")) {
    scans = [];
    localStorage.removeItem("qr_scans");
    renderResults();
  }
});
