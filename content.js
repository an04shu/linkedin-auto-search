// content.js - attempt search then click "People" filter/tab
(async () => {
  try {
    const query = window.__LINKEDIN_QUERY || (typeof arguments !== "undefined" ? arguments[0] : null);

    const showBanner = (text, color = "#0077b5", ms = 4000) => {
      try {
        const b = document.createElement("div");
        b.textContent = text;
        b.style.cssText = `position:fixed;top:0;left:0;right:0;background:${color};color:#fff;padding:6px 8px;text-align:center;z-index:999999;font-family:Arial,sans-serif;font-size:13px;`;
        document.documentElement.appendChild(b);
        setTimeout(() => b.remove(), ms);
      } catch (e) { /* ignore */ }
    };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    showBanner("AutoSearch: starting...", "#0077b5");

    if (!query) {
      console.error("No query found.");
      showBanner("No query provided", "#b01e1e");
      return;
    }
    console.log("Query:", query);
    showBanner(`Searching: ${query}`, "#0a7");

    // --- FIND/TYPE/ENTER (same robust typing) ---
    const selectors = [
      "input[placeholder='Search']",
      "input[aria-label='Search']",
      "input[role='combobox']",
      "input.search-global-typeahead__input",
      "input.global-nav__primary-search-input",
      "input[type='search']",
      "div.search-global-typeahead__input input"
    ];

    async function waitForSearchEl(timeoutMs = 20000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        for (const sel of selectors) {
          try {
            const el = document.querySelector(sel);
            if (el) return { el, sel };
          } catch (e) {}
        }
        await sleep(400);
      }
      return null;
    }

    const found = await waitForSearchEl(20000);
    if (!found) {
      console.error("Could not find search input.");
      showBanner("Search input not found", "#b01e1e");
      return;
    }

    const searchEl = found.el;
    console.log("Found search element:", found.sel, searchEl);

    try { searchEl.focus(); } catch(e) {}
    await sleep(50);

    // clear
    try {
      if ("value" in searchEl) searchEl.value = "";
      else searchEl.setAttribute("value", "");
      searchEl.dispatchEvent(new InputEvent("input", { bubbles: true }));
      searchEl.dispatchEvent(new Event("change", { bubbles: true }));
    } catch(e) { console.warn("clear failed", e); }
    await sleep(60);

    // type
    for (const c of String(query)) {
      try {
        if ("value" in searchEl) searchEl.value += c;
        else searchEl.setAttribute("value", (searchEl.getAttribute("value")||"") + c);

        searchEl.dispatchEvent(new InputEvent("input", { bubbles: true, data: c }));
        searchEl.dispatchEvent(new Event("change", { bubbles: true }));

        const kd = new KeyboardEvent("keydown", { key: c, bubbles: true, cancelable: true });
        const kp = new KeyboardEvent("keypress", { key: c, bubbles: true, cancelable: true });
        const ku = new KeyboardEvent("keyup", { key: c, bubbles: true, cancelable: true });
        searchEl.dispatchEvent(kd);
        searchEl.dispatchEvent(kp);
        searchEl.dispatchEvent(ku);
      } catch(e) { console.warn("type char failed", e); }
      await sleep(30);
    }

    await sleep(600);

    // Trigger Enter
    try {
      const down = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
      const press = new KeyboardEvent("keypress", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
      const up = new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
      searchEl.dispatchEvent(down);
      searchEl.dispatchEvent(press);
      searchEl.dispatchEvent(up);
      console.log("Enter key dispatched on search element");
    } catch(e) { console.warn("Enter dispatch failed", e); }

    // wait for results to load (URL or content change)
    // We'll wait a bit and then try to locate the People tab.
    await sleep(1200);

    // --- CLICK "People" FILTER/TAB ---
    // Strategies:
    // 1) Look for an element with role/tab and text 'People'
    // 2) Look for a link/button with href containing '/search/results/people'
    // 3) Find clickable ancestor if text node is inside span/div

    function textEqualsPeople(node) {
      if (!node) return false;
      const t = (node.innerText || node.textContent || "").trim();
      return t === "People" || t.toLowerCase().startsWith("people");
    }

    async function clickElement(el) {
      if (!el) return false;
      try {
        // prefer direct click()
        el.click();
        console.log("Clicked element directly:", el);
        return true;
      } catch (e) {
        console.warn("Direct click failed, dispatching mouse events", e);
      }
      try {
        const rect = el.getBoundingClientRect();
        const evtOpts = { bubbles: true, cancelable: true, composed: true, clientX: rect.left + 2, clientY: rect.top + 2 };
        el.dispatchEvent(new MouseEvent("mousedown", evtOpts));
        el.dispatchEvent(new MouseEvent("mouseup", evtOpts));
        el.dispatchEvent(new MouseEvent("click", evtOpts));
        console.log("Dispatched mouse events to element:", el);
        return true;
      } catch (e) {
        console.warn("Mouse event dispatch failed", e);
        return false;
      }
    }

    // wait for the top filters to render and then search for People
    async function findAndClickPeople(timeoutMs = 15000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        // 1) try anchors/buttons whose href contains '/search/results/people'
        try {
          const anchors = Array.from(document.querySelectorAll("a, button"));
          for (const a of anchors) {
            try {
              const href = a.getAttribute && a.getAttribute("href");
              if (href && href.includes("/search/results/people")) {
                console.log("Found people link by href:", a, href);
                if (await clickElement(a)) return { method: "href", el: a };
              }
            } catch {}
            try {
              if (textEqualsPeople(a)) {
                console.log("Found people element by text (a/button):", a);
                if (await clickElement(a)) return { method: "text", el: a };
              }
            } catch {}
          }
        } catch(e){}

        // 2) try spans/divs with text 'People' (then click nearest clickable ancestor)
        try {
          const textNodes = Array.from(document.querySelectorAll("span, div, p, li"));
          for (const n of textNodes) {
            if (!n || !n.innerText) continue;
            if (textEqualsPeople(n)) {
              // find nearest clickable ancestor
              const clickable = n.closest("a, button, [role='tab'], [role='button']");
              if (clickable) {
                console.log("Found people text and clickable ancestor:", n, clickable);
                if (await clickElement(clickable)) return { method: "ancestor", el: clickable };
              } else {
                // try clicking the node itself
                if (await clickElement(n)) return { method: "self", el: n };
              }
            }
          }
        } catch(e){}

        // 3) fallback: find visible items inside the top filter container (common LinkedIn layout)
        try {
          const containers = document.querySelectorAll("div.search-vertical-filter, div.search-entities, div.search-filters, nav, ul");
          for (const cont of containers) {
            try {
              const candidate = Array.from(cont.querySelectorAll("*")).find(el => textEqualsPeople(el));
              if (candidate) {
                const clickable = candidate.closest("a, button, [role='tab'], [role='button']") || candidate;
                console.log("Found candidate in container:", candidate, clickable);
                if (await clickElement(clickable)) return { method: "container", el: clickable };
              }
            } catch {}
          }
        } catch(e){}

        await sleep(500);
      }
      return null;
    }

    const peopleResult = await findAndClickPeople(15000);
    if (peopleResult) {
      console.log("Clicked People filter/tab by method:", peopleResult.method, peopleResult.el);
      showBanner("People tab clicked", "#0a7");
      // wait for results to load after clicking People
      await sleep(1200);
      console.log("After clicking People, current URL:", location.href);
    } else {
      console.warn("Could not find or click People filter/tab within timeout.");
      showBanner("People tab not found", "#b01e1e");
    }

    // debug info
    console.log("Final URL:", location.href);
    const currentVal = ("value" in searchEl) ? searchEl.value : searchEl.getAttribute("value");
    console.log("Search input value:", currentVal);
    showBanner("AutoSearch finished attempt", "#005983", 3000);

  } catch (err) {
    console.error("content.js error:", err);
    try { showBanner("AutoSearch error", "#b01e1e", 6000); } catch(e){}
  }
})();
