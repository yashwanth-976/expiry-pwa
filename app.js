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

const request = indexedDB.open("expiryDB", 1);

// Create database structure
request.onupgradeneeded = function (event) {
  db = event.target.result;
  db.createObjectStore("products", {
    keyPath: "id",
    autoIncrement: true
  });
};

// Success
request.onsuccess = function (event) {
  db = event.target.result;
  loadProducts();
};

// Error
request.onerror = function () {
  console.log("Database failed to open");
};

// Add product
document.getElementById("productForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const expiry = document.getElementById("expiry").value;

  const transaction = db.transaction(["products"], "readwrite");
  const store = transaction.objectStore("products");

  store.add({
    name: name,
    expiry: expiry
  });

  transaction.oncomplete = function () {
    loadProducts();
    document.getElementById("productForm").reset();
  };
});

// Load products
function loadProducts() {
  const list = document.getElementById("productList");
  list.innerHTML = "";

  const transaction = db.transaction(["products"], "readonly");
  const store = transaction.objectStore("products");

  const today = new Date();

  store.openCursor().onsuccess = function (event) {
    const cursor = event.target.result;

    if (cursor) {
      const expiryDate = new Date(cursor.value.expiry);
      const diffTime = expiryDate - today;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let statusClass = "safe";
      let statusText = "Safe";

      if (daysLeft <= 0) {
        statusClass = "expired";
        statusText = "Expired";

        showNotification(
          "❌ Product Expired",
          `${cursor.value.name} has expired!`
        );
      } 
      else if (daysLeft <= 1) {
        statusClass = "warning";
        statusText = "Expiring Tomorrow";

        showNotification(
          "⚠️ Expiry Alert",
          `${cursor.value.name} expires tomorrow`
        );
      }

      const li = document.createElement("li");
      li.className = statusClass;
      li.innerHTML = `
        <strong>${cursor.value.name}</strong><br>
        Expires on: ${cursor.value.expiry}<br>
        Status: ${statusText} (${daysLeft} days left)
      `;

      list.appendChild(li);

      cursor.continue(); // VERY IMPORTANT
    }
  };
}


// Register Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

function showNotification(title, message) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: message,
      icon: "icon.png" // optional
    });
  }
}

