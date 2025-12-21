// app.js
"use strict";

let storyNodes = {};
let currentNodeId = "scene_1_start";
const history = [];

async function loadGame() {
  const res = await fetch("./game.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Nešlo načíst game.json (${res.status})`);
  const game = await res.json();

  storyNodes = adaptGameToStoryNodes(game);
  currentNodeId = game.startId || "scene_1_start";
  renderNode(currentNodeId);
}

function adaptGameToStoryNodes(game) {
  const nodes = {};
  for (const [id, n] of Object.entries(game.scenes)) {
    const taskText =
      n.task && typeof n.task.prompt === "string" && n.task.prompt.trim()
        ? n.task.prompt.trim()
        : "";

    nodes[id] = {
      title: n.title || "",
      text: n.text || "",
      task: taskText,
      choices: Array.isArray(n.choices)
        ? n.choices.map((c) => ({
            label: c.text || c.label || "",
            nextId: c.nextId || "",
          }))
        : [],
    };
  }
  return nodes;
}

function renderNode(nodeId) {
  const node = storyNodes[nodeId];
  if (!node) {
    console.error("Neznámý uzel:", nodeId);
    return;
  }
  currentNodeId = nodeId;

  const titleEl = document.getElementById("scene-title");
  const textEl = document.getElementById("scene-text");
  const taskEl = document.getElementById("scene-task");
  const choicesEl = document.getElementById("choices");

  // Title
  const t = node.title || "";
  if (titleEl) {
    titleEl.textContent = t;
    titleEl.title = t; // iOS neumí tooltip vždy, ale nevadí
  }
  document.title = t ? `${t} — Laura & Panda` : "Laura & Panda";

  // Text
  if (textEl) textEl.textContent = node.text || "";

  // Optional task box (hidden by default in your new JSON)
  if (taskEl) {
    const task = node.task || "";
    if (task) {
      taskEl.style.display = "block";
      taskEl.textContent = task;
    } else {
      taskEl.style.display = "none";
      taskEl.textContent = "";
    }
  }

  // Choices
  if (choicesEl) {
    choicesEl.innerHTML = "";
    if (node.choices && node.choices.length > 0) {
      node.choices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = choice.label || ""; // ✅ žádné A/B/C, žádné šipky
        btn.addEventListener("click", () => goTo(choice.nextId));
        choicesEl.appendChild(btn);
      });
    } else {
      const info = document.createElement("div");
      info.textContent = "Konec příběhu. Teď je prostor na volné povídání.";
      choicesEl.appendChild(info);
    }
  }

  updateBackButton();
}

function goTo(nextId) {
  if (!nextId) return;
  if (currentNodeId) history.push(currentNodeId);
  renderNode(nextId);
}

function updateBackButton() {
  const backBtn = document.getElementById("back-btn");
  if (!backBtn) return;
  backBtn.disabled = history.length === 0;
}

function goBack() {
  if (history.length === 0) return;
  const prevId = history.pop();
  renderNode(prevId);
}

// --- Restart modal ---
function setupRestart() {
  const restartBtn = document.getElementById("restart-btn");
  const modal = document.getElementById("restart-modal");
  const confirmBtn = document.getElementById("restart-confirm");
  const cancelBtn = document.getElementById("restart-cancel");

  if (!restartBtn || !modal || !confirmBtn || !cancelBtn) return;

  const open = () => modal.classList.add("open");
  const close = () => modal.classList.remove("open");

  restartBtn.addEventListener("click", open);
  cancelBtn.addEventListener("click", close);

  // click outside modal closes
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  // ESC closes
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  confirmBtn.addEventListener("click", () => {
    history.length = 0;
    close();
    renderNode("scene_1_start");
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("back-btn");
  if (backBtn) backBtn.addEventListener("click", goBack);

  setupRestart();

  loadGame().catch((err) => {
    console.error(err);
    const titleEl = document.getElementById("scene-title");
    const textEl = document.getElementById("scene-text");
    if (titleEl) titleEl.textContent = "Chyba načítání";
    if (textEl) {
      textEl.textContent =
        "Nepodařilo se načíst game.json. Na GitHub Pages to poběží. Lokálně použij Live Server.";
    }
  });
});
