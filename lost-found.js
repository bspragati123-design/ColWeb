"use strict";

(() => {
  const STORAGE_KEY = "colweb_lost_found_reports_v1";
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
  const MAX_IMAGE_DIMENSION = 1000;
  const MAX_IMAGE_DATA_LENGTH = 450000;
  const $ = (id) => document.getElementById(id);

  const elements = {
    grid: $("items-grid"),
    empty: $("empty-state"),
    emptyTitle: $("empty-title"),
    emptyMessage: $("empty-message"),
    search: $("search-input"),
    type: $("type-filter"),
    category: $("category-filter"),
    status: $("status-filter"),
    count: $("results-count"),
    formModal: $("report-modal"),
    detailsModal: $("details-modal"),
    form: $("report-form"),
    formError: $("form-error"),
    imageInput: $("item-image"),
    imagePreview: $("image-preview"),
    saveButton: $("save-report"),
    toast: $("toast")
  };

  let reports = loadReports();
  let selectedImage = "";
  let toastTimer = null;
  let lastFocusedElement = null;

  function loadReports() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(isValidReport) : [];
    } catch (error) {
      console.error("Could not read saved reports:", error);
      return [];
    }
  }

  function isValidReport(item) {
    return item && typeof item.id === "string" &&
      ["lost", "found"].includes(item.type) &&
      typeof item.name === "string" &&
      typeof item.description === "string" &&
      typeof item.location === "string" &&
      typeof item.category === "string";
  }

  function saveReports() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      return true;
    } catch (error) {
      console.error("Could not save reports:", error);
      showToast("Storage is full. Remove an image or delete an old report.");
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `report-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function formatDate(value) {
    if (!value) return "Date not provided";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return "Date not provided";
    }

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");

    window.clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 2800);
  }

  function updateStats() {
    $("stat-total").textContent = reports.length;

    $("stat-lost").textContent = reports.filter(
      (item) => item.type === "lost" && !item.resolved
    ).length;

    $("stat-found").textContent = reports.filter(
      (item) => item.type === "found" && !item.resolved
    ).length;

    $("stat-resolved").textContent = reports.filter(
      (item) => item.resolved
    ).length;
  }

  function getFilteredReports() {
    const query = elements.search.value.trim().toLowerCase();
    const type = elements.type.value;
    const category = elements.category.value.trim();
    const status = elements.status.value;

    return reports.filter((item) => {
      const searchable = [
        item.name,
        item.description,
        item.location,
        item.category
      ].join(" ").toLowerCase();

      const matchesQuery = !query || searchable.includes(query);
      const matchesType = type === "all" || item.type === type;
      const matchesCategory =
        category === "all" || item.category === category;

      const matchesStatus =
        status === "all" ||
        (status === "resolved" ? item.resolved : !item.resolved);

      return matchesQuery &&
        matchesType &&
        matchesCategory &&
        matchesStatus;
    }).sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }

  function renderReports() {
    const filtered = getFilteredReports();

    elements.grid.innerHTML = filtered.map((item) => {
      const image = item.image
        ? `<img class="item-image" src="${item.image}" alt="${escapeHTML(item.name)}" loading="lazy">`
        : `<div class="image-placeholder" aria-hidden="true">${item.type === "lost" ? "🔎" : "🎁"}</div>`;

      return `
        <article class="item-card">
          <div class="item-image-wrap">
            ${image}

            <span class="type-badge ${item.type === "found" ? "found" : ""}">
              ${item.type === "lost" ? "LOST ITEM" : "FOUND ITEM"}
            </span>

            <span class="status-badge ${item.resolved ? "resolved" : ""}">
              ${item.resolved ? "RESOLVED" : "ACTIVE"}
            </span>
          </div>

          <div class="item-body">
            <div class="item-meta">
              <span class="item-category">${escapeHTML(item.category)}</span>
              <span>${escapeHTML(formatDate(item.itemDate))}</span>
            </div>

            <h3>${escapeHTML(item.name)}</h3>

            <p class="item-description">
              ${escapeHTML(item.description)}
            </p>

            <p class="item-location">
              📍 ${escapeHTML(item.location)}
            </p>

            <div class="item-actions">
              <button class="button button-light" type="button"
                data-action="details" data-id="${escapeHTML(item.id)}">
                View details
              </button>

              <button class="button button-outline" type="button"
                data-action="contact" data-id="${escapeHTML(item.id)}">
                Contact
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    elements.count.textContent =
      `Showing ${filtered.length} of ${reports.length} ${reports.length === 1 ? "report" : "reports"}`;

    elements.empty.hidden = filtered.length !== 0;
    elements.grid.hidden = filtered.length === 0;

    if (reports.length === 0) {
      elements.emptyTitle.textContent = "No reports yet";
      elements.emptyMessage.textContent =
        "Be the first to add a lost or found item to the campus board.";
    } else {
      elements.emptyTitle.textContent = "No matching reports";
      elements.emptyMessage.textContent =
        "Try changing your search or filters.";
    }

    updateStats();
  }

  function openModal(modal) {
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";

    const focusTarget = modal.querySelector(
      "input:not([type=hidden]), button, select, textarea"
    );

    if (focusTarget) focusTarget.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = "";

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus === "function"
    ) {
      lastFocusedElement.focus();
    }
  }

  function resetForm() {
    elements.form.reset();

    $("edit-id").value = "";
    selectedImage = "";

    elements.imagePreview.src = "";
    elements.imagePreview.hidden = true;

    elements.formError.textContent = "";

    $("modal-title").textContent = "Create a report";
    elements.saveButton.textContent = "Publish report";

    $("item-date").value = new Date().toISOString().slice(0, 10);
  }

  function openReportForm(type = "lost", report = null) {
    resetForm();

    if (report) {
      $("modal-title").textContent = "Edit your report";
      elements.saveButton.textContent = "Save changes";

      $("edit-id").value = report.id;
      $("item-name").value = report.name;
      $("item-category").value = report.category;
      $("item-location").value = report.location;
      $("item-date").value = report.itemDate;
      $("item-description").value = report.description;
      $("reporter-name").value = report.reporterName;
      $("reporter-email").value = report.email;
      $("reporter-phone").value = report.phone || "";

      const radio = document.querySelector(
        `input[name="reportType"][value="${report.type}"]`
      );

      if (radio) radio.checked = true;

      selectedImage = report.image || "";

      if (selectedImage) {
        elements.imagePreview.src = selectedImage;
        elements.imagePreview.hidden = false;
      }
    } else {
      const radio = document.querySelector(
        `input[name="reportType"][value="${type}"]`
      );

      if (radio) radio.checked = true;
    }

    openModal(elements.formModal);
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        reject(new Error("Choose a JPG, PNG or WebP image."));
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        reject(new Error("Image must be 5 MB or smaller."));
        return;
      }

      const reader = new FileReader();

      reader.onerror = () => {
        reject(new Error("Could not read this image. Try another file."));
      };

      reader.onload = () => {
        const image = new Image();

        image.onerror = () => {
          reject(new Error("This image could not be opened."));
        };

        image.onload = () => {
          const scale = Math.min(
            1,
            MAX_IMAGE_DIMENSION / Math.max(image.width, image.height)
          );

          const canvas = document.createElement("canvas");

          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));

          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Image processing is not supported by this browser."));
            return;
          }

          context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
          );

          const dataUrl = canvas.toDataURL("image/jpeg", 0.72);

          if (dataUrl.length > MAX_IMAGE_DATA_LENGTH) {
            reject(new Error(
              "This image is still too large. Please choose a smaller image."
            ));
            return;
          }

          resolve(dataUrl);
        };

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  async function handleImageChange() {
    const file = elements.imageInput.files &&
      elements.imageInput.files[0];

    if (!file) return;

    elements.formError.textContent = "";

    try {
      selectedImage = await compressImage(file);
      elements.imagePreview.src = selectedImage;
      elements.imagePreview.hidden = false;
    } catch (error) {
      elements.imageInput.value = "";
      selectedImage = "";
      elements.imagePreview.hidden = true;
      elements.formError.textContent = error.message;
    }
  }

  function validateForm(data) {
    if (
      !data.name ||
      !data.category ||
      !data.location ||
      !data.itemDate ||
      !data.description ||
      !data.reporterName ||
      !data.email
    ) {
      return "Please complete all required fields.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return "Please enter a valid email address.";
    }

    if (data.itemDate > new Date().toISOString().slice(0, 10)) {
      return "The item date cannot be in the future.";
    }

    return "";
  }

  function handleSubmit(event) {
    event.preventDefault();
    elements.formError.textContent = "";

    const formData = new FormData(elements.form);
    const editId = $("edit-id").value;

    const existing = editId
      ? reports.find((item) => item.id === editId)
      : null;

    const data = {
      id: editId || makeId(),
      type: formData.get("reportType"),
      name: String(formData.get("itemName") || "").trim(),
      category: String(formData.get("category") || "").trim(),
      location: String(formData.get("location") || "").trim(),
      itemDate: String(formData.get("itemDate") || ""),
      description: String(formData.get("description") || "").trim(),
      reporterName: String(formData.get("reporterName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      image: selectedImage,
      resolved: existing ? existing.resolved : false,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const error = validateForm(data);

    if (error) {
      elements.formError.textContent = error;
      return;
    }

    const previousReports = reports.slice();

    if (existing) {
      reports = reports.map((item) =>
        item.id === editId ? data : item
      );
    } else {
      reports.unshift(data);
    }

    if (!saveReports()) {
      reports = previousReports;
      return;
    }

    closeModal(elements.formModal);
    resetForm();
    renderReports();

    showToast(
      existing
        ? "Your report has been updated."
        : "Your report has been published."
    );
  }

  function openDetails(id) {
    const item = reports.find((report) => report.id === id);

    if (!item) return;

    const image = item.image
      ? `<img class="details-image" src="${item.image}" alt="${escapeHTML(item.name)}">`
      : `<div class="details-placeholder" aria-hidden="true">${item.type === "lost" ? "🔎" : "🎁"}</div>`;

    $("details-title").textContent = item.name;

    $("details-content").innerHTML = `
      ${image}

      <div class="details-info">
        <div class="detail-cell">
          <span>REPORT TYPE</span>
          <strong>${item.type === "lost" ? "Lost item" : "Found item"}</strong>
        </div>

        <div class="detail-cell">
          <span>CATEGORY</span>
          <strong>${escapeHTML(item.category)}</strong>
        </div>

        <div class="detail-cell">
          <span>LOCATION</span>
          <strong>${escapeHTML(item.location)}</strong>
        </div>

        <div class="detail-cell">
          <span>DATE</span>
          <strong>${escapeHTML(formatDate(item.itemDate))}</strong>
        </div>

        <div class="detail-cell">
          <span>REPORTED BY</span>
          <strong>${escapeHTML(item.reporterName)}</strong>
        </div>

        <div class="detail-cell">
          <span>STATUS</span>
          <strong>${item.resolved ? "Resolved" : "Active"}</strong>
        </div>
      </div>

      <p class="details-description">${escapeHTML(item.description)}</p>

      <div class="details-actions">
        <a class="button button-primary"
          href="mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent("ColWeb Lost & Found: " + item.name)}">
          Email reporter
        </a>

        ${item.phone ? `
          <a class="button button-light"
            href="tel:${encodeURIComponent(item.phone)}">
            Call reporter
          </a>
        ` : ""}

        <button class="button button-outline" type="button"
          data-action="edit" data-id="${escapeHTML(item.id)}">
          Edit
        </button>

        <button class="button button-outline" type="button"
          data-action="resolve" data-id="${escapeHTML(item.id)}">
          ${item.resolved ? "Reopen" : "Mark resolved"}
        </button>

        <button class="button button-light" type="button"
          data-action="delete" data-id="${escapeHTML(item.id)}">
          Delete
        </button>
      </div>
    `;

    openModal(elements.detailsModal);
  }

  function handleCardAction(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;

    const item = reports.find((report) => report.id === id);

    if (!item) return;

    if (action === "details") {
      openDetails(id);
    }

    if (action === "contact") {
      window.location.href =
        `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent("ColWeb Lost & Found: " + item.name)}`;
    }
  }

  function handleDetailsAction(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;

    const item = reports.find((report) => report.id === id);

    if (!item) return;

    if (action === "edit") {
      closeModal(elements.detailsModal);
      openReportForm(item.type, item);

    } else if (action === "resolve") {
      const previousReports = reports.slice();

      reports = reports.map((report) =>
        report.id === id
          ? {
              ...report,
              resolved: !report.resolved,
              updatedAt: new Date().toISOString()
            }
          : report
      );

      if (saveReports()) {
        closeModal(elements.detailsModal);
        renderReports();

        showToast(
          item.resolved
            ? "Report reopened."
            : "Marked as resolved."
        );
      } else {
        reports = previousReports;
      }

    } else if (action === "delete") {
      if (!window.confirm("Delete this report permanently from this browser?")) {
        return;
      }

      const previousReports = reports.slice();

      reports = reports.filter((report) => report.id !== id);

      if (saveReports()) {
        closeModal(elements.detailsModal);
        renderReports();
        showToast("Report deleted.");
      } else {
        reports = previousReports;
      }
    }
  }

  function clearFilters() {
    elements.search.value = "";
    elements.type.value = "all";
    elements.category.value = "all";
    elements.status.value = "active";

    renderReports();
  }

  $("open-report-top").addEventListener(
    "click",
    () => openReportForm()
  );

  $("open-report-main").addEventListener(
    "click",
    () => openReportForm()
  );

  $("hero-report-lost").addEventListener(
    "click",
    () => openReportForm("lost")
  );

  $("hero-report-found").addEventListener(
    "click",
    () => openReportForm("found")
  );

  $("empty-report").addEventListener(
    "click",
    () => openReportForm()
  );

  $("close-modal").addEventListener(
    "click",
    () => closeModal(elements.formModal)
  );

  $("cancel-form").addEventListener("click", () => {
    closeModal(elements.formModal);
    resetForm();
  });

  $("close-details").addEventListener(
    "click",
    () => closeModal(elements.detailsModal)
  );

  elements.formModal.addEventListener("click", (event) => {
    if (event.target === elements.formModal) {
      closeModal(elements.formModal);
      resetForm();
    }
  });

  elements.detailsModal.addEventListener("click", (event) => {
    if (event.target === elements.detailsModal) {
      closeModal(elements.detailsModal);
    }
  });

  elements.form.addEventListener("submit", handleSubmit);

  elements.imageInput.addEventListener(
    "change",
    handleImageChange
  );

  elements.grid.addEventListener(
    "click",
    handleCardAction
  );

  $("details-content").addEventListener(
    "click",
    handleDetailsAction
  );

  [
    elements.search,
    elements.type,
    elements.category,
    elements.status
  ].forEach((control) => {
    control.addEventListener("input", renderReports);
    control.addEventListener("change", renderReports);
  });

  $("clear-filters").addEventListener(
    "click",
    clearFilters
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!elements.detailsModal.hidden) {
        closeModal(elements.detailsModal);
      } else if (!elements.formModal.hidden) {
        closeModal(elements.formModal);
        resetForm();
      }
    }
  });

  $("current-year").textContent = new Date().getFullYear();

  $("item-date").max = new Date().toISOString().slice(0, 10);

  resetForm();
  renderReports();
})();