
"use strict";

(() => {
    const DAYS = [
        "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday"
    ];

    const PERIODS = [1, 2, 3, 4, 5, 6, 7];
    const STORAGE_PREFIX = "colweb-timetable-v1-semester-";

    const semesterSelect = document.getElementById("semester-select");
    const timetableBody = document.getElementById("timetable-body");
    const classForm = document.getElementById("class-form");

    const dayInput = document.getElementById("day-input");
    const periodInput = document.getElementById("period-input");
    const subjectInput = document.getElementById("subject-input");
    const codeInput = document.getElementById("code-input");
    const facultyInput = document.getElementById("faculty-input");
    const roomInput = document.getElementById("room-input");

    const editorTitle = document.getElementById("editor-title");
    const formNote = document.getElementById("form-note");
    const cancelEditButton = document.getElementById("cancel-edit");
    const saveButton = document.getElementById("save-class");

    const filledCount = document.getElementById("filled-count");
    const summarySemester = document.getElementById("summary-semester");
    const tableTitle = document.getElementById("table-title");
    const sampleTag = document.getElementById("sample-tag");
    const statusMessage = document.getElementById("status-message");
    const todayLabel = document.getElementById("today-label");

    let timetable = {};
    let editingKey = null;

    // Editable sample based on the supplied SMVIT 3rd-semester timetable.
    function createReferenceSemesterThree() {
        return {
            "Monday|1": { code: "1BCS304", subject: "Operating Systems" },
            "Monday|2": { code: "1BCS301", subject: "Probability, Distributions and Statistics" },
            "Monday|3": { code: "1BCS306", subject: "DSA Lab · Batch B1 / B2", room: "NB-413 / NB107B" },
            "Monday|4": { code: "1BCS307A", subject: "Project Management with Git", room: "NB-413 / NB107B" },
            "Monday|5": { code: "1BCS303", subject: "Digital Design and Computer Organization", faculty: "Theory" },
            "Monday|6": { code: "1BCP308", subject: "Community Project" },
            "Monday|7": { code: "LG", subject: "Counselling" },

            "Tuesday|1": { code: "1BCS303", subject: "Digital Design and Computer Organization" },
            "Tuesday|2": { code: "1BCS302", subject: "Object Oriented Programming with Java" },
            "Tuesday|3": { code: "1BCS304", subject: "Operating Systems" },
            "Tuesday|4": { code: "1BCS305", subject: "Data Structures and Applications" },
            "Tuesday|5": { code: "1BCS302", subject: "Java Lab · Section D / Batch B1", room: "BMATHS Lab" },
            "Tuesday|6": { code: "1BCS302", subject: "Java Lab · Section D / Batch B1", room: "BMATHS Lab" },

            "Wednesday|1": { code: "1BCS301", subject: "Probability, Distributions and Statistics" },
            "Wednesday|2": { code: "1BCS303", subject: "Digital Design and Computer Organization" },
            "Wednesday|3": { code: "1BCS306", subject: "DSA Lab · Batch B1 / B2", room: "NB-413 / NB107B" },
            "Wednesday|4": { code: "1BCS307A", subject: "Project Management with Git", room: "NB-413 / NB107B" },
            "Wednesday|5": { code: "Forum", subject: "Club Activities / SAP" },
            "Wednesday|6": { code: "Forum", subject: "Club Activities / SAP" },

            "Thursday|1": { code: "1BCS304", subject: "Operating Systems" },
            "Thursday|2": { code: "1BCS305", subject: "Data Structures and Applications" },
            "Thursday|3": { code: "1BCS301", subject: "Probability, Distributions and Statistics" },
            "Thursday|4": { code: "1BCS302", subject: "Object Oriented Programming with Java" },
            "Thursday|5": { code: "1BCS302", subject: "Java Lab · Section D / Batch B2", room: "BMATHS Lab" },
            "Thursday|6": { code: "1BCS302", subject: "Java Lab · Section D / Batch B2", room: "BMATHS Lab" },
            "Thursday|7": { code: "LG", subject: "Counselling" },

            "Friday|1": { code: "1BCS305", subject: "Data Structures and Applications" },
            "Friday|2": { code: "1BCS303", subject: "Digital Design and Computer Organization" },
            "Friday|3": { code: "1BCS301", subject: "Probability, Distributions and Statistics", faculty: "Theory" },
            "Friday|4": { code: "1BCS302", subject: "Object Oriented Programming with Java" },
            "Friday|5": { code: "1BCS303", subject: "Digital Design and Computer Organization", faculty: "Self Learning" },
            "Friday|6": { code: "1BCS301", subject: "Probability, Distributions and Statistics", faculty: "Theory" },
            "Friday|7": { code: "Remedial", subject: "Remedial Class" },

            "Saturday|2": { code: "1BMAT309", subject: "Mathematical Course" },
            "Saturday|5": { code: "Skill Development", subject: "Skill Development Program" },
            "Saturday|6": { code: "Skill Development", subject: "Skill Development Program" },
            "Saturday|7": { code: "Skill Development", subject: "Skill Development Program" }
        };
    }

    function semesterName(value) {
        const suffix = value === "1" ? "st" :
            value === "2" ? "nd" :
            value === "3" ? "rd" : "th";

        return `${value}${suffix} Semester`;
    }

    function storageKey() {
        return STORAGE_PREFIX + semesterSelect.value;
    }

    function showStatus(message) {
        statusMessage.textContent = message;
    }

    function slotKey(day, period) {
        return `${day}|${period}`;
    }

    function saveSemester(showMessage = true) {
        try {
            localStorage.setItem(storageKey(), JSON.stringify(timetable));

            if (showMessage) {
                showStatus("Saved automatically in this browser.");
            }

            return true;
        } catch (error) {
            showStatus("Could not save. Check your browser storage settings.");
            return false;
        }
    }

    function loadSemester() {
        try {
            const saved = localStorage.getItem(storageKey());

            if (saved !== null) {
                const parsed = JSON.parse(saved);
                timetable = parsed && typeof parsed === "object" &&
                    !Array.isArray(parsed) ? parsed : {};
            } else {
                timetable = semesterSelect.value === "3"
                    ? createReferenceSemesterThree()
                    : {};

                saveSemester(false);
            }
        } catch (error) {
            timetable = semesterSelect.value === "3"
                ? createReferenceSemesterThree()
                : {};

            showStatus("Browser storage could not be read. Changes may not persist.");
        }

        editingKey = null;
        resetForm();
        renderTimetable();
        updateSummary();
        updateCurrentPeriod();
    }

    function createTextElement(tag, className, value) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        element.textContent = value;
        return element;
    }

    function makeSlotCard(day, period, item) {
        const card = document.createElement("div");
        card.className = "slot-card";

        if (item.code) {
            card.appendChild(createTextElement("p", "slot-code", item.code));
        }

        card.appendChild(
            createTextElement("p", "slot-subject", item.subject || "Class")
        );

        const details = [item.faculty, item.room].filter(Boolean).join(" · ");

        if (details) {
            card.appendChild(createTextElement("p", "slot-meta", details));
        }

        const actions = document.createElement("div");
        actions.className = "slot-actions";

        const editButton = createTextElement("button", "", "Edit");
        editButton.type = "button";
        editButton.dataset.action = "edit";
        editButton.dataset.day = day;
        editButton.dataset.period = String(period);

        const deleteButton = createTextElement("button", "delete-slot", "Delete");
        deleteButton.type = "button";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.day = day;
        deleteButton.dataset.period = String(period);

        actions.append(editButton, deleteButton);
        card.appendChild(actions);

        return card;
    }

    function renderTimetable() {
        timetableBody.replaceChildren();

        DAYS.forEach((day) => {
            const row = document.createElement("tr");
            row.dataset.day = day;

            const dayHeading = createTextElement("th", "", day);
            dayHeading.scope = "row";
            row.appendChild(dayHeading);

            PERIODS.forEach((period) => {
                if (day === "Monday" && period === 3) {
                    const shortBreak = createTextElement(
                        "td", "break-column", "TEA BREAK"
                    );
                    shortBreak.rowSpan = 6;
                    row.appendChild(shortBreak);
                }

                if (day === "Monday" && period === 5) {
                    const lunch = createTextElement(
                        "td", "break-column lunch-column", "LUNCH BREAK"
                    );
                    lunch.rowSpan = 6;
                    row.appendChild(lunch);
                }

                const cell = document.createElement("td");
                cell.dataset.day = day;
                cell.dataset.period = String(period);

                const item = timetable[slotKey(day, period)];

                if (item && typeof item === "object" && item.subject) {
                    cell.appendChild(makeSlotCard(day, period, item));
                } else {
                    const addButton = createTextElement(
                        "button", "slot-add", "+ Add"
                    );

                    addButton.type = "button";
                    addButton.dataset.action = "add";
                    addButton.dataset.day = day;
                    addButton.dataset.period = String(period);

                    cell.appendChild(addButton);
                }

                row.appendChild(cell);
            });

            timetableBody.appendChild(row);
        });

        updateTodayRow();
    }

    function updateSummary() {
        const name = semesterName(semesterSelect.value);

        summarySemester.textContent = name;
        tableTitle.textContent = `${name} Timetable`;

        const count = Object.values(timetable).filter(
            item => item && typeof item === "object" && item.subject
        ).length;

        filledCount.textContent = `${count} / 42`;
        sampleTag.hidden = semesterSelect.value !== "3";
    }

    function resetForm() {
        classForm.reset();
        dayInput.value = "Monday";
        periodInput.value = "1";

        editingKey = null;
        editorTitle.textContent = "Add a class";
        saveButton.textContent = "Save class";
        cancelEditButton.hidden = true;

        formNote.textContent =
            "Select any slot in the timetable to fill it quickly.";
    }

    function startEditing(day, period) {
        const key = slotKey(day, period);
        const item = timetable[key] || {};

        editingKey = key;

        dayInput.value = day;
        periodInput.value = String(period);
        subjectInput.value = item.subject || "";
        codeInput.value = item.code || "";
        facultyInput.value = item.faculty || "";
        roomInput.value = item.room || "";

        editorTitle.textContent = "Edit class";
        saveButton.textContent = "Update class";
        cancelEditButton.hidden = false;

        formNote.textContent = `Editing ${day}, Period ${period}.`;

        document.getElementById("editor-panel").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        subjectInput.focus({ preventScroll: true });
    }

    function updateTodayRow() {
        const today = new Intl.DateTimeFormat("en-US", {
            weekday: "long"
        }).format(new Date());

        timetableBody.querySelectorAll("tr").forEach(row => {
            row.classList.toggle("is-today", row.dataset.day === today);
        });

        timetableBody.querySelectorAll("td[data-day]").forEach(cell => {
            cell.classList.toggle("today-cell", cell.dataset.day === today);
        });
    }

    function updateCurrentPeriod() {
        timetableBody.querySelectorAll(".current-period").forEach(cell => {
            cell.classList.remove("current-period");
        });

        const now = new Date();
        const day = new Intl.DateTimeFormat("en-US", {
            weekday: "long"
        }).format(now);

        const minutes = now.getHours() * 60 + now.getMinutes();

        const ranges = {
            1: [540, 595],
            2: [595, 650],
            3: [660, 715],
            4: [715, 770],
            5: [815, 870],
            6: [870, 925],
            7: [925, 980]
        };

        let currentPeriod = null;

        for (const [period, range] of Object.entries(ranges)) {
            if (minutes >= range[0] && minutes < range[1]) {
                currentPeriod = period;
                break;
            }
        }

        if (DAYS.includes(day) && currentPeriod) {
            const cell = timetableBody.querySelector(
                `td[data-day="${day}"][data-period="${currentPeriod}"]`
            );

            if (cell) {
                cell.classList.add("current-period");
            }
        }

        todayLabel.textContent =
            `${day} · ${now.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
            })}`;
    }

    timetableBody.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const day = button.dataset.day;
        const period = Number(button.dataset.period);
        const key = slotKey(day, period);

        if (button.dataset.action === "add" ||
            button.dataset.action === "edit") {
            startEditing(day, period);
            return;
        }

        if (button.dataset.action === "delete") {
            const item = timetable[key];

            if (!item) return;

            const confirmed = window.confirm(
                `Delete ${item.subject} from ${day}, Period ${period}?`
            );

            if (!confirmed) return;

            delete timetable[key];

            saveSemester();
            renderTimetable();
            updateSummary();

            if (editingKey === key) {
                resetForm();
            }
        }
    });

    classForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const subject = subjectInput.value.trim();

        if (!subject) {
            subjectInput.focus();
            showStatus("Please enter a subject or activity name.");
            return;
        }

        const day = dayInput.value;
        const period = Number(periodInput.value);
        const newKey = slotKey(day, period);
        const oldKey = editingKey;

        if (oldKey && oldKey !== newKey && timetable[newKey]) {
            showStatus(
                "That slot is already filled. Choose another slot or edit its existing class."
            );
            return;
        }

        if (!oldKey && timetable[newKey]) {
            showStatus(
                "That slot is already filled. Use its Edit button to update it."
            );
            return;
        }

        if (oldKey && oldKey !== newKey) {
            delete timetable[oldKey];
        }

        timetable[newKey] = {
            subject: subject,
            code: codeInput.value.trim(),
            faculty: facultyInput.value.trim(),
            room: roomInput.value.trim()
        };

        saveSemester();
        resetForm();
        renderTimetable();
        updateSummary();
        updateCurrentPeriod();
    });

    cancelEditButton.addEventListener("click", resetForm);

    semesterSelect.addEventListener("change", loadSemester);

    document.getElementById("reset-button").addEventListener("click", () => {
        const name = semesterName(semesterSelect.value);

        const confirmed = window.confirm(
            `Reset the ${name} timetable? All saved entries for this semester in this browser will be removed.`
        );

        if (!confirmed) return;

        timetable = semesterSelect.value === "3"
            ? createReferenceSemesterThree()
            : {};

        saveSemester();
        resetForm();
        renderTimetable();
        updateSummary();

        showStatus(`${name} timetable has been reset.`);
    });

    document.getElementById("export-button").addEventListener("click", () => {
        const payload = {
            app: "ColWeb Student Timetable",
            semester: Number(semesterSelect.value),
            exportedAt: new Date().toISOString(),
            timetable: timetable
        };

        const blob = new Blob(
            [JSON.stringify(payload, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download =
            `colweb-semester-${semesterSelect.value}-timetable.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        showStatus("Timetable backup exported as a JSON file.");
    });

    loadSemester();
    updateCurrentPeriod();

    window.setInterval(updateCurrentPeriod, 60 * 1000);
})();
