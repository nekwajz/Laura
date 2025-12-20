// app.js — jednoduchý engine pro interaktivní příběh (GitHub Pages friendly)
"use strict";

let storyNodes = {};
let currentNodeId = "scene_1_start";
let START_NODE_ID = "scene_1_start";
const history = [];

// Zkusí načíst první dostupný soubor z kandidátů (hodí se, když se soubor jmenuje jinak)
const GAME_CANDIDATES = ["./game.json", "./Laura.json", "./Laura.txt"];

async function fetchFirstAvailable(urls) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        lastErr = new Error(`${url}: ${res.status} ${res.statusText}`);
        continue;
      }
      return { url, json: await res.json() };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Nepodařilo se načíst žádný herní JSON soubor.");
}

async function loadGame() {
  const { url, json } = await fetchFirstAvailable(GAME_CANDIDATES);

  // Adaptace: game.scenes -> storyNodes, choice.text -> choice.label
  storyNodes = adaptGameToStoryNodes(json);

  START_NODE_ID = json.startId || "scene_1_start";
  currentNodeId = START_NODE_ID;

  // (volitelné) debug do konzole
  console.log("Game loaded from:", url);

  renderNode(currentNodeId);
}

function adaptGameToStoryNodes(game) {
  if (!game || !game.scenes || typeof game.scenes !== "object") {
    throw new Error("game.json nemá očekávaný tvar: chybí objekt 'scenes'.");
  }

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
            label: c.text ?? c.label ?? "",
            nextId: c.nextId
          }))
        : []
    };
  }
  return nodes;
}

function renderNode(nodeId) {
  const node = storyNodes[nodeId];
  if (!node) {
    console.error("Neznámý uzel:", nodeId);
    setErrorUI("Neznámý uzel", `Neznámý uzel: ${nodeId}`);
    updateNavButtons();
    return;
  }

  currentNodeId = nodeId;

  const titleEl = document.getElementById("scene-title");
  const textEl = document.getElementById("scene-text");
  const taskEl = document.getElementById("scene-task");
  const choicesEl = document.getElementById("choices");

  if (titleEl) titleEl.textContent = node.title || "";
  if (textEl) textEl.textContent = node.text || "";

  if (taskEl) {
    if (node.task) {
      taskEl.style.display = "";
      taskEl.textContent = node.task;
    } else {
      taskEl.style.display = "none";
      taskEl.textContent = "";
    }
  }

  if (choicesEl) {
    choicesEl.innerHTML = "";

    if (node.choices && node.choices.length > 0) {
      node.choices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.type = "button";
        btn.textContent = choice.label || "Pokračovat";
        btn.onclick = () => goTo(choice.nextId);
        choicesEl.appendChild(btn);
      });
    } else {
      const info = document.createElement("div");
      info.className = "end-note";
      info.textContent = "Konec příběhu. Teď je prostor na volné povídání.";
      choicesEl.appendChild(info);
    }
  }

  updateNavButtons();
}

function setErrorUI(title, message) {
  const titleEl = document.getElementById("scene-title");
  const textEl = document.getElementById("scene-text");
  const choicesEl = document.getElementById("choices");
  const taskEl = document.getElementById("scene-task");
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = message;
  if (taskEl) {
    taskEl.style.display = "none";
    taskEl.textContent = "";
  }
  if (choicesEl) choicesEl.innerHTML = "";
}

function goTo(nextId) {
  if (!nextId) return;
  history.push(currentNodeId);
  renderNode(nextId);
}

function updateNavButtons() {
  const backBtn = document.getElementById("back-btn");
  if (backBtn) backBtn.disabled = history.length === 0;
}

function goBack() {
  if (history.length === 0) return;
  const prevId = history.pop();
  renderNode(prevId);
}

// ===== Restart modal =====
function openRestartModal() {
  const modal = document.getElementById("restart-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  // Fokus na „ne, chci zůstat“ (bezpečnější default)
  const cancelBtn = document.getElementById("restart-cancel");
  if (cancelBtn) cancelBtn.focus();
}

function closeRestartModal() {
  const modal = document.getElementById("restart-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function doRestart() {
  history.length = 0;
  renderNode(START_NODE_ID);
  closeRestartModal();
}

window.addEventListener("DOMContentLoaded", () => {
  // Back
  const backBtn = document.getElementById("back-btn");
  if (backBtn) backBtn.addEventListener("click", goBack);

  // Restart
  const restartBtn = document.getElementById("restart-btn");
  if (restartBtn) restartBtn.addEventListener("click", openRestartModal);

  const restartConfirm = document.getElementById("restart-confirm");
  if (restartConfirm) restartConfirm.addEventListener("click", doRestart);

  const restartCancel = document.getElementById("restart-cancel");
  if (restartCancel) restartCancel.addEventListener("click", closeRestartModal);

  // Klik na pozadí modalu = zavřít
  const modal = document.getElementById("restart-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeRestartModal();
    });
  }

  // ESC = zavřít modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeRestartModal();
  });

  loadGame().catch((err) => {
    console.error(err);
    setErrorUI(
      "Chyba načítání",
      "Nepodařilo se načíst herní data. Na GitHub Pages to běží, ale lokálně (file://) může fetch selhat. Použij lokální server (např. Live Server)."
    );
    updateNavButtons();
  });
});
