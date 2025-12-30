// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

// IndexedDB Setup
let db;
let dbReady = false;
let editId = null;

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
  loadProducts();
};

request.onerror = function () {
  console.log("Database failed to open");
};

// Add / Update Product
document.getElementById("productForm").addEventListener("submit", function (e) {
  e.preventDefault();
  if (!dbReady) return;

  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }

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

// Load Products
function loadProducts() {
  if (!dbReady) return;

  const list = document.getElementById("productList");
  list.innerHTML = "";

  const tx = db.transaction("products", "readonly");
  const store = tx.objectStore("products");

  const today = new Date();

  store.openCursor().onsuccess = function (event) {
    const cursor = event.target.result;
    if (!cursor) return;

    const expiryDate = new Date(cursor.value.expiry);
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

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
        Modify
      </button>
      <button class="delete-btn" onclick="deleteProduct(${cursor.key})">
        Delete
      </button>
    `;

    list.appendChild(li);

    if (daysLeft === 1 && Notification.permission === "granted") {
      new Notification("Expiry Alert", {
        body: `${cursor.value.name} expires tomorrow`
      });
    }

    cursor.continue();
  };
}

// Delete Product
function deleteProduct(id) {
  if (!dbReady) return;

  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");

  store.delete(id);

  tx.oncomplete = function () {
    loadProducts();
  };
}

// Edit Product
function editProduct(id, name, expiry) {
  editId = id;
  document.getElementById("name").value = name;
  document.getElementById("expiry").value = expiry;
}
