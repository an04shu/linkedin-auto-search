// content.js - robust debug version
(async () => {
  try {
    const query = window.__LINKEDIN_QUERY || (typeof arguments !== "undefined" ? arguments[0] : null);

    // Visual banner so you can see the script ran
    const showBanner = (text, color = "#0077b5") => {
      try {
        const b = document.createElement("div");
        b.textContent = text;
        b.style.cssText = `position:fixed;top:0;left:0;right:0;background:${color};color:#fff;padding:6px 8px;text-align:center;z-index:999999;font-family:Arial,sans-serif;font-size:13px;`;
        document.documentElement.appendChild(b);
        setTimeout(() => b.remove(), 6000);
      } catch (e) { /* ignore */ }
    };

    showBanner("LinkedIn AutoSearch injected — looking for query...");

    console.log("🔍 content.js started");

    if (!query) {
      console.error("❌ No query found on window.__LINKEDIN_QUERY or arguments[0].");
      showBanner("No query provided", "#b01e1e");
      return;
    }

    console.log("🔎 Query:", query);
    showBanner(`Searching for: ${query}`, "#0a7");

    // Helper: sleep
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // Try multiple selectors (LinkedIn variants)
    const selectors = [
      "input[placeholder='Search']",
      "input[aria-label='Search']",
      "input[role='combobox']",
      "input.search-global-typeahead__input",
      "input.global-nav__primary-search-input",
      "input[type='search']",
      "div.search-global-typeahead__input input"
    ];

    // Wait up to ~20s for an element
    async function waitForSearchEl(timeoutMs = 20000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        for (const sel of selectors) {
          try {
            const el = document.querySelector(sel);
            if (el) return { el, sel };
          } catch (e) { /* ignore bad selectors */ }
        }
        await sleep(500);
      }
      return null;
    }

    const found = await waitForSearchEl(20000);
    if (!found) {
      console.error("❌ Could not find any search input using known selectors.");
      showBanner("Search input not found", "#b01e1e");
      // Optionally dump candidate elements
      console.log("Tried selectors:", selectors);
      return;
    }

    const searchEl = found.el;
    console.log("✅ Found search element using selector:", found.sel, searchEl);

    // Focus it
    try {
      searchEl.focus();
      await sleep(50);
    } catch (e) {
      console.warn("Could not focus element:", e);
    }

    // Clear existing text and dispatch input events
    try {
      // Clear by selecting and deleting (some React inputs don't like direct .value)
      if (typeof searchEl.select === "function") {
        try { searchEl.select(); } catch (e) {}
      }
      // Some LinkedIn inputs are not standard inputs. Use value if available
      if ("value" in searchEl) {
        searchEl.value = "";
      } else {
        // fallback: try setAttribute
        searchEl.setAttribute("value", "");
      }
      // Dispatch input/change
      searchEl.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
      searchEl.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(80);
    } catch (e) {
      console.warn("Unable to clear input normally:", e);
    }

    // Type character by character (simulate human typing)
    for (const char of String(query)) {
      try {
        if ("value" in searchEl) {
          searchEl.value += char;
        } else {
          // some wrappers might need textContent modification or attribute
          searchEl.setAttribute("value", (searchEl.getAttribute("value") || "") + char);
        }

        // Dispatch several events LinkedIn might listen for
        searchEl.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, data: char }));
        searchEl.dispatchEvent(new Event("change", { bubbles: true }));
        // keydown/keyup/keypress events on the active element
        const kd = new KeyboardEvent("keydown", { key: char, char, bubbles: true, cancelable: true });
        const kp = new KeyboardEvent("keypress", { key: char, char, bubbles: true, cancelable: true });
        const ku = new KeyboardEvent("keyup", { key: char, char, bubbles: true, cancelable: true });
        searchEl.dispatchEvent(kd);
        searchEl.dispatchEvent(kp);
        searchEl.dispatchEvent(ku);
      } catch (e) {
        console.warn("Typing char failed:", e);
      }
      await sleep(30); // small delay per char
    }

    // Let LinkedIn handle autocomplete/ajax
    await sleep(600);

    // Attempt to trigger Enter key on the same element
    try {
      const down = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
      const press = new KeyboardEvent("keypress", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
      const up = new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
      searchEl.dispatchEvent(down);
      searchEl.dispatchEvent(press);
      searchEl.dispatchEvent(up);
      console.log("⏎ Dispatched Enter key events on searchEl");
    } catch (e) {
      console.warn("Dispatching Enter failed:", e);
    }

    // If Enter did not work, try clicking search button if available
    await sleep(400);
    const clickSelectors = [
      "button[aria-label='Search']",
      "button[aria-label='Search people, jobs, posts, and more']",
      "button.search-global-typeahead__icon",
      "button[type='submit']",
      "button[title='Search']"
    ];
    let clicked = false;
    for (const cs of clickSelectors) {
      try {
        const btn = document.querySelector(cs);
        if (btn) {
          btn.click();
          clicked = true;
          console.log("Clicked search button using selector:", cs, btn);
          break;
        }
      } catch (e) { /* ignore */ }
    }

    if (!clicked) {
      // Try to find clickable element near the input (parent)
      try {
        const parent = searchEl.closest("form, div");
        if (parent) {
          const btn = parent.querySelector("button");
          if (btn) {
            btn.click();
            clicked = true;
            console.log("Clicked parent button", btn);
          }
        }
      } catch (e) { /* ignore */ }
    }

    await sleep(500);

    // Final check: print current URL and input value for debugging
    console.log("Current URL after attempt:", location.href);
    console.log("Current input value:", ("value" in searchEl) ? searchEl.value : searchEl.getAttribute("value"));
    showBanner("Search action attempted — check console", "#005983");

    console.log("✅ content.js finished attempt");
  } catch (err) {
    console.error("Unexpected error in content.js:", err);
    try { 
      const b = document.createElement("div");
      b.textContent = "AutoSearch error: " + String(err);
      b.style.cssText = "position:fixed;bottom:0;left:0;background:#b01e1e;color:#fff;padding:6px;z-index:999999;";
      document.documentElement.appendChild(b);
      setTimeout(() => b.remove(), 8000);
    } catch(e) {}
  }
})();
