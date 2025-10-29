chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "startSearch") {
    const searchQuery = message.query;

    // Open LinkedIn feed
    chrome.tabs.create({ url: "https://www.linkedin.com/feed/" }, (tab) => {
      const listener = (tabId, info) => {
        if (tabId === tab.id && info.status === "complete") {
          // extra delay for React re-renders
          setTimeout(async () => {
            try {
              // 1) Inject a small script that stores the query into window.__LINKEDIN_QUERY
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (q) => { window.__LINKEDIN_QUERY = q; },
                args: [searchQuery],
              });

              // 2) Inject the content.js file which will read window.__LINKEDIN_QUERY
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"],
              });

              console.log("Injected content.js (two-step) successfully.");
            } catch (err) {
              console.error("❌ Script injection failed:", err);
            }
          }, 3000);
          chrome.tabs.onUpdated.removeListener(listener);
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  }
});
