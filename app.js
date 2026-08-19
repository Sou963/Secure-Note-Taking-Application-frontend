// Live API on Vercel
const API = "https://secure-note-taking-application.vercel.app/api";

let token = localStorage.getItem("token") || null;
let currentUser = JSON.parse(localStorage.getItem("user") || "null");
let notesPage = 1;
let postsPage = 1;
let usersPage = 1;
let adminNotesPage = 1;

function showMessage(text, type = "error") {
  const el = document.getElementById("message");
  el.textContent = text;
  el.className = "message " + type;
  setTimeout(() => {
    el.className = "message";
    el.textContent = "";
  }, 5000);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });
  } catch (networkErr) {
    throw new Error(
      "Cannot reach server. Check API URL and Vercel deployment."
    );
  }

  let data = {};
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    throw new Error(
      res.ok
        ? "Invalid response from server"
        : `Server error (${res.status}). Check /api/health on Vercel.`
    );
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

// Auth UI
function showLogin() {
  document.getElementById("login-form").style.display = "block";
  document.getElementById("register-form").style.display = "none";
  document.getElementById("tab-login").classList.add("active");
  document.getElementById("tab-register").classList.remove("active");
}

function showRegister() {
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "block";
  document.getElementById("tab-login").classList.remove("active");
  document.getElementById("tab-register").classList.add("active");
}

function updateUI() {
  if (token && currentUser) {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("app-section").style.display = "block";
    document.getElementById(
      "user-info"
    ).textContent = `${currentUser.name} (${currentUser.email}) — ${currentUser.role}`;
    const adminBtn = document.getElementById("nav-admin");
    if (currentUser.role === "admin") {
      adminBtn.style.display = "inline-block";
    } else {
      adminBtn.style.display = "none";
    }
    showTab("notes");
  } else {
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("app-section").style.display = "none";
  }
}

async function login() {
  try {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    token = data.token;
    currentUser = {
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      interests: data.interests,
    };
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(currentUser));
    showMessage("Logged in successfully", "success");
    updateUI();
  } catch (err) {
    showMessage(err.message);
  }
}

async function register() {
  try {
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const interests = document
      .getElementById("reg-interests")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, interests }),
    });
    token = data.token;
    currentUser = {
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      interests: data.interests,
    };
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(currentUser));
    showMessage("Registered successfully", "success");
    updateUI();
  } catch (err) {
    showMessage(err.message);
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  updateUI();
}

function showTab(name) {
  ["notes", "posts", "admin"].forEach((t) => {
    document.getElementById("tab-" + t).style.display =
      t === name ? "block" : "none";
    document.getElementById("nav-" + t).classList.toggle("active", t === name);
  });
  if (name === "notes") loadNotes(1);
  if (name === "posts") loadPosts(1);
  if (name === "admin") {
    loadUsers(1);
    loadAdminNotes(1);
  }
}

// Notes
async function loadNotes(page = 1) {
  notesPage = page;
  try {
    const data = await api(`/notes?page=${page}&limit=5`);
    const list = document.getElementById("notes-list");
    list.innerHTML =
      data.notes
        .map(
          (n) => `
      <div class="card">
        <h4>${escapeHtml(n.title)}</h4>
        <div class="meta">${n.user?.name || ""} · ${new Date(
            n.createdAt
          ).toLocaleString()}</div>
        <p>${escapeHtml(n.content)}</p>
        <div class="actions">
          <button onclick="editNote('${n._id}', '${escapeAttr(
            n.title
          )}', '${escapeAttr(n.content)}')">Edit</button>
          <button class="delete" onclick="deleteNote('${
            n._id
          }')">Delete</button>
        </div>
      </div>`
        )
        .join("") || "<p>No notes yet.</p>";
    renderPagination("notes-pagination", data.page, data.totalPages, loadNotes);
  } catch (err) {
    showMessage(err.message);
  }
}

async function createNote() {
  try {
    const title = document.getElementById("note-title").value.trim();
    const content = document.getElementById("note-content").value.trim();
    await api("/notes", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    });
    document.getElementById("note-title").value = "";
    document.getElementById("note-content").value = "";
    showMessage("Note created", "success");
    loadNotes(1);
  } catch (err) {
    showMessage(err.message);
  }
}

function editNote(id, title, content) {
  const newTitle = prompt("New title", title);
  if (newTitle === null) return;
  const newContent = prompt("New content", content);
  if (newContent === null) return;
  api(`/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title: newTitle, content: newContent }),
  })
    .then(() => {
      showMessage("Note updated", "success");
      loadNotes(notesPage);
    })
    .catch((err) => showMessage(err.message));
}

async function deleteNote(id) {
  if (!confirm("Delete this note?")) return;
  try {
    await api(`/notes/${id}`, { method: "DELETE" });
    showMessage("Note deleted", "success");
    loadNotes(notesPage);
  } catch (err) {
    showMessage(err.message);
  }
}

// Posts
async function loadPosts(page = 1) {
  postsPage = page;
  try {
    const data = await api(`/posts?page=${page}&limit=5`);
    const list = document.getElementById("posts-list");
    list.innerHTML =
      data.posts
        .map(
          (p) => `
      <div class="card">
        <h4>${escapeHtml(p.title)}</h4>
        <div class="meta">${p.author?.name || ""} · ${new Date(
            p.createdAt
          ).toLocaleString()}</div>
        <p>${escapeHtml(p.content)}</p>
        <button style="width:auto;margin-top:8px;" onclick="loadUserPosts('${
          p.author?._id
        }')">View author's posts</button>
      </div>`
        )
        .join("") || "<p>No posts yet.</p>";
    renderPagination("posts-pagination", data.page, data.totalPages, loadPosts);
  } catch (err) {
    showMessage(err.message);
  }
}

async function createPost() {
  try {
    const title = document.getElementById("post-title").value.trim();
    const content = document.getElementById("post-content").value.trim();
    await api("/posts", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    });
    document.getElementById("post-title").value = "";
    document.getElementById("post-content").value = "";
    showMessage("Post created", "success");
    loadPosts(1);
  } catch (err) {
    showMessage(err.message);
  }
}

async function loadUserPosts(userId) {
  try {
    const data = await api(`/posts/user/${userId}?page=1&limit=10`);
    alert(
      `Posts by ${data.user.name}:\n\n` +
        (data.posts.map((p) => `• ${p.title}`).join("\n") || "None")
    );
  } catch (err) {
    showMessage(err.message);
  }
}

// Admin
async function loadUsers(page = 1) {
  usersPage = page;
  try {
    const data = await api(`/users?page=${page}&limit=5`);
    const list = document.getElementById("users-list");
    list.innerHTML =
      data.users
        .map(
          (u) => `
      <div class="card">
        <h4>${escapeHtml(u.name)} (${u.role})</h4>
        <div class="meta">${u.email} · Interests: ${
            (u.interests || []).join(", ") || "—"
          }</div>
        <div class="actions">
          <button onclick="adminEditUser('${u._id}', '${escapeAttr(
            u.name
          )}', '${escapeAttr(u.email)}', '${u.role}')">Edit</button>
          <button class="delete" onclick="adminDeleteUser('${
            u._id
          }')">Delete</button>
        </div>
      </div>`
        )
        .join("") || "<p>No users.</p>";
    renderPagination("users-pagination", data.page, data.totalPages, loadUsers);
  } catch (err) {
    showMessage(err.message);
  }
}

async function adminCreateUser() {
  try {
    const name = document.getElementById("admin-name").value.trim();
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value;
    const role = document.getElementById("admin-role").value;
    const interests = document
      .getElementById("admin-interests")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await api("/users", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role, interests }),
    });
    showMessage("User created", "success");
    document.getElementById("admin-name").value = "";
    document.getElementById("admin-email").value = "";
    document.getElementById("admin-password").value = "";
    document.getElementById("admin-interests").value = "";
    loadUsers(1);
  } catch (err) {
    showMessage(err.message);
  }
}

function adminEditUser(id, name, email, role) {
  const newName = prompt("Name", name);
  if (newName === null) return;
  const newEmail = prompt("Email", email);
  if (newEmail === null) return;
  const newRole = prompt("Role (user/admin)", role);
  if (newRole === null) return;
  api(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name: newName, email: newEmail, role: newRole }),
  })
    .then(() => {
      showMessage("User updated", "success");
      loadUsers(usersPage);
    })
    .catch((err) => showMessage(err.message));
}

async function adminDeleteUser(id) {
  if (!confirm("Delete this user?")) return;
  try {
    await api(`/users/${id}`, { method: "DELETE" });
    showMessage("User deleted", "success");
    loadUsers(usersPage);
  } catch (err) {
    showMessage(err.message);
  }
}

async function loadGroupByInterests() {
  try {
    const data = await api("/users/group-by-interests");
    const el = document.getElementById("interests-groups");
    el.innerHTML =
      data
        .map(
          (g) => `
      <div class="interest-group">
        <strong>${escapeHtml(g.interest)} (${g.count})</strong>
        ${g.users.map((u) => escapeHtml(u.name)).join(", ")}
      </div>`
        )
        .join("") || "<p>No interest groups.</p>";
  } catch (err) {
    showMessage(err.message);
  }
}

async function loadAdminNotes(page = 1) {
  adminNotesPage = page;
  try {
    const data = await api(`/notes?page=${page}&limit=5`);
    const list = document.getElementById("admin-notes-list");
    list.innerHTML =
      data.notes
        .map(
          (n) => `
      <div class="card">
        <h4>${escapeHtml(n.title)}</h4>
        <div class="meta">By ${n.user?.name || "—"} · ${new Date(
            n.createdAt
          ).toLocaleString()}</div>
        <p>${escapeHtml(n.content)}</p>
      </div>`
        )
        .join("") || "<p>No notes.</p>";
    renderPagination(
      "admin-notes-pagination",
      data.page,
      data.totalPages,
      loadAdminNotes
    );
  } catch (err) {
    showMessage(err.message);
  }
}

function renderPagination(containerId, page, totalPages, loader) {
  const el = document.getElementById(containerId);
  if (totalPages <= 1) {
    el.innerHTML = "";
    return;
  }
  let html = "";
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${
      i === page ? "active" : ""
    }" onclick="(${loader})(${i})">${i}</button>`;
  }
  el.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

// Init
updateUI();
