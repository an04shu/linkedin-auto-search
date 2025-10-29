document.getElementById("searchBtn").addEventListener("click", () => {
  const query = document.getElementById("searchInput").value.trim();
  const status = document.getElementById("status");

  if (!query) {
    status.textContent = "⚠️ Please enter something to search.";
    return;
  }

  status.textContent = "⏳ Opening LinkedIn...";

  chrome.runtime.sendMessage({ type: "startSearch", query });
});
