if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js")
      .then(() => console.log("Service Worker Registered"))
      .catch(err => console.log("SW registration failed:", err));
  });
}

if ("Notification" in window) {
  Notification.requestPermission();
}

let db;
let dbReady = false;

const request = indexedDB.open("expiryDB", 1);


request.onupgradeneeded = function (event) {
  db = event.target.result;
  db.createObjectStore("products", {
    keyPath: "id",
    autoIncrement: true
  });
};

request.onsuccess = function (event) {
  db = event.target.result;
  dbReady = true;
  loadProducts(); // Load ONLY when DB is ready
};

request.onerror = function () {
  console.log("Database failed to open");
};

// Add product
let editId = null;

document.getElementById("productForm").addEventListener("submit", function (e) {
  e.preventDefault();

  if (!dbReady) return;

  const name = document.getElementById("name").value;
  const expiry = document.getElementById("expiry").value;

  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");

  if (editId !== null) {
    store.put({ id: editId, name, expiry });
    editId = null;
  } else {
    store.add({ name, expiry });
  }

  tx.oncomplete = function () {
    loadProducts();
    document.getElementById("productForm").reset();
  };
});

// Load products
function loadProducts() {
  if (!dbReady) return; // Mobile safety

  const list = document.getElementById("productList");
  list.innerHTML = "";

  const tx = db.transaction("products", "readonly");
  const store = tx.objectStore("products");

  const today = new Date();

  store.openCursor().onsuccess = function (event) {
    const cursor = event.target.result;
    if (!cursor) return;

    const expiryDate = new Date(cursor.value.expiry);
    const diffTime = expiryDate - today;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let statusClass = "safe";
    let statusText = "Safe";

    if (daysLeft <= 0) {
      statusClass = "expired";
      statusText = "Expired";
    } else if (daysLeft <= 1) {
      statusClass = "warning";
      statusText = "Expiring Tomorrow";
    }

    const li = document.createElement("li");
    li.className = statusClass;

   li.innerHTML = `
  <strong>${cursor.value.name}</strong><br>
  Expires on: ${cursor.value.expiry}<br>
  Status: ${statusText} (${daysLeft} days left)
  <br>
  <button onclick="editProduct(${cursor.key}, '${cursor.value.name}', '${cursor.value.expiry}')">
  Edit
</button>
<button class="delete-btn" onclick="deleteProduct(${cursor.key})">
  Delete
</button>
`;
    
    list.appendChild(li);

    // 🔔 Notify only when app is opened (mobile-safe)
    if (daysLeft === 1 && Notification.permission === "granted") {
      new Notification("Expiry Alert", {
        body: `${cursor.value.name} expires tomorrow`
      });
    }

    cursor.continue();
  };
}
function deleteProduct(id) {
  if (!dbReady) return;

  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");

  store.delete(id);

  tx.oncomplete = function () {
    loadProducts(); // Refresh UI
  };
}

let editId = null;

function editProduct(id, name, expiry) {
  editId = id;
  document.getElementById("name").value = name;
  document.getElementById("expiry").value = expiry;
}


// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

function showNotification(title, message) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: message,
      icon: "icon.png" // optional
    });
  }
}





