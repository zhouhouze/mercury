const tabButtons = document.querySelectorAll(".rail-button");
const views = document.querySelectorAll(".view");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.view;

    tabButtons.forEach((item) => item.classList.toggle("active", item === button));
    views.forEach((view) => view.classList.toggle("active", view.id === `view-${target}`));
  });
});

const sourceContent = {
  located: {
    title: "Page context",
    copy: "Located in DOM. The selected node maps to a visible passage on the current page.",
    label: "located",
  },
  fallback: {
    title: "Evidence fallback",
    copy: "Fallback evidence is available, but the original passage could not be highlighted in the current DOM.",
    label: "fallback",
  },
  blocked: {
    title: "Debug boundary",
    copy: "Blocked state. The UI must not present this as a successful source highlight.",
    label: "blocked",
  },
};

const sourceTitle = document.querySelector("#source-title");
const sourceCopy = document.querySelector("#source-copy");
const sourceStatus = document.querySelector("#source-status");
const nodes = document.querySelectorAll(".node");

nodes.forEach((node) => {
  node.addEventListener("click", () => {
    nodes.forEach((item) => item.classList.toggle("selected", item === node));
    const state = node.dataset.source || "located";
    const content = sourceContent[state];
    sourceTitle.textContent = content.title;
    sourceCopy.textContent = content.copy;
    sourceStatus.textContent = content.label;
    sourceStatus.className = `source-status ${content.label}`;
  });
});

