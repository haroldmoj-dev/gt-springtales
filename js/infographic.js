// Generic asset selector with recursive folder scanning for .png files

(function () {
  function hamburgerFunc() {
    const hamburger = document.querySelector(".hamburger");
    const rightMenu = document.querySelector(".navbar .right");

    hamburger.addEventListener("click", function (e) {
      rightMenu.classList.toggle("active");
      e.stopPropagation();
    });

    document.addEventListener("click", function (e) {
      if (!hamburger.contains(e.target) && !rightMenu.contains(e.target)) {
        rightMenu.classList.remove("active");
      }
    });
  }

  // Utility: fetch HTML text for a folder URL
  async function fetchHtml(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.text();
    } catch (e) {
      return null;
    }
  }

  // Recursively scan a directory listing for PNGs.
  // baseRelativePath: e.g. "../public/weapon/" (relative to current page)
  // returns: [{ filename, src }]
  async function listPngsRecursive(baseRelativePath, maxFolders = 50) {
    const baseUrl = new URL(baseRelativePath, location.href).href;
    const seen = new Set();
    const foldersToVisit = [baseUrl];
    const pngs = [];
    let visitedCount = 0;

    while (foldersToVisit.length && visitedCount < maxFolders) {
      const folderUrl = foldersToVisit.shift();
      if (seen.has(folderUrl)) continue;
      seen.add(folderUrl);
      visitedCount++;

      const text = await fetchHtml(folderUrl);
      if (!text) continue;

      // parse anchors in the directory listing HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const anchors = Array.from(doc.querySelectorAll("a"))
        .map((a) => a.getAttribute("href"))
        .filter(Boolean);

      for (const href of anchors) {
        // Resolve href against folderUrl
        try {
          const resolved = new URL(href, folderUrl).href;
          // If it looks like a directory (ends with '/'), queue it
          if (href.endsWith("/")) {
            if (!seen.has(resolved)) foldersToVisit.push(resolved);
            continue;
          }
          // If it's a png, add to list
          if (href.toLowerCase().endsWith(".png")) {
            const filename = decodeURIComponent(resolved.split("/").pop());
            // Use resolved URL as src (absolute) so it loads regardless of current path
            pngs.push({ filename, src: resolved });
          }
        } catch (e) {
          // ignore malformed hrefs
          continue;
        }
      }
    }

    // Remove duplicates by filename+src
    const unique = [];
    const uniqSet = new Set();
    pngs.forEach((p) => {
      const key = `${p.filename}::${p.src}`;
      if (!uniqSet.has(key)) {
        uniqSet.add(key);
        unique.push(p);
      }
    });

    return unique;
  }

  // Render images into the popup image-list
  function renderImagesToList(imageListEl, items, currentTarget, popupEl) {
    imageListEl.innerHTML = "";
    items.forEach((item) => {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.filename;
      img.style.width = "80px";
      img.style.height = "80px";
      img.style.objectFit = "cover";
      img.style.cursor = "pointer";
      img.style.border = "2px solid transparent";

      img.onerror = function () {
        if (!img.dataset.retry) {
          img.dataset.retry = "1";
          // try alternate relative paths (host-rooted and page-relative)
          const name = item.filename;
          const tryA = new URL(`/public/${name}`, location.origin).href;
          const tryB = new URL(`../public/${name}`, location.href).href;
          if (img.src !== tryA) img.src = tryA;
          else if (img.src !== tryB) img.src = tryB;
          else img.style.display = "none";
        } else {
          img.style.display = "none";
        }
      };

      img.addEventListener("click", function () {
        if (!currentTarget) return;
        currentTarget.style.backgroundImage = `url('${img.src}')`;
        currentTarget.style.backgroundSize = "cover";
        currentTarget.style.backgroundPosition = "center";
        Array.from(imageListEl.children).forEach(
          (child) => (child.style.border = "2px solid transparent")
        );
        popupEl.style.display = "none";
      });

      imageListEl.appendChild(img);
    });
  }

  // Init binding: attach to elements with data-asset and data-folder
  function initAssetSelector() {
    const popup = document.getElementById("asset-popup");
    const imageList = document.getElementById("asset-image-list");
    const popupTitle = document.getElementById("asset-popup-title");
    if (!popup || !imageList || !popupTitle) return;

    const cache = {}; // folderRelativePath -> items array

    document.querySelectorAll("[data-asset][data-folder]").forEach((el) => {
      el.addEventListener("click", async function (e) {
        e.stopPropagation();
        const folder = el.getAttribute("data-folder"); // e.g. "weapon"
        const label = el.getAttribute("data-asset") || "Image";
        // construct relative path to public folder (matches your project layout)
        const folderRelativePath = `../public/${folder}/`;

        popupTitle.textContent = `Select ${label}`;
        popup.style.display = "flex";

        // render cached quickly if available
        if (cache[folderRelativePath] && cache[folderRelativePath].length) {
          renderImagesToList(imageList, cache[folderRelativePath], el, popup);
        }

        // load (with recursion) and cache
        const items = await listPngsRecursive(folderRelativePath);
        cache[folderRelativePath] = items;
        if (items && items.length) {
          renderImagesToList(imageList, items, el, popup);
        } else {
          // show a minimal message if nothing found
          imageList.innerHTML =
            "<div style='padding:12px;color:#666'>No images found</div>";
        }
      });
    });

    // close popup on outside click
    popup.addEventListener("click", function (e) {
      if (e.target === popup) popup.style.display = "none";
    });
  }

  // Wire up on DOM ready (HTML uses defer but guard anyway)
  document.addEventListener("DOMContentLoaded", function () {
    try {
      hamburgerFunc();
      initAssetSelector();
    } catch (e) {
      // silent
      console.error(e);
    }
  });
})();
