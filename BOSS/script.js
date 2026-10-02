/* =========================
   HERO BACKGROUND
========================= */

const backgrounds = ["BOSS2.webp", "BOSS3.png", "BOSS4.png"];
let currentBackground = 0;

function changeBackground() {
    const hero = document.querySelector(".part1");
    if (!hero) return;

    hero.style.backgroundImage = `
        linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)),
        url("${backgrounds[currentBackground]}")
    `;

    currentBackground =
        (currentBackground + 1) % backgrounds.length;
}

changeBackground();
setInterval(changeBackground, 5000);


/* =========================
   MOBILE NAVIGATION
========================= */

const menuButton = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");

if (menuButton && navLinks) {
    menuButton.addEventListener("click", () => {
        navLinks.classList.toggle("active");
    });

    const dropdownParents = document.querySelectorAll(
        "#nav-links > li"
    );

    dropdownParents.forEach((parent) => {
        const link = parent.querySelector(":scope > a");
        const dropdown = parent.querySelector(":scope > ul");

        if (!link || !dropdown) return;

        link.addEventListener("click", (event) => {
            if (window.innerWidth > 900) return;

            event.preventDefault();

            dropdownParents.forEach((item) => {
                if (item !== parent) {
                    item.classList.remove("active");
                }
            });

            parent.classList.toggle("active");
        });
    });
}


/* =========================
   GALLERY FILTERS
========================= */

const filterButtons = document.querySelectorAll(".filter-btn");
const galleryItems = document.querySelectorAll(".gallery-item");

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        filterButtons.forEach((item) => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        galleryItems.forEach((item) => {
            const matches =
                button.dataset.filter === "all" ||
                item.dataset.category === button.dataset.filter;

            item.classList.toggle("hide", !matches);
        });
    });
});


/* =========================
   ADMIN APPLICATIONS
========================= */

async function loadApplications() {
    const applicationList =
        document.getElementById("admin-application-list");

    if (!applicationList || typeof supabaseClient === "undefined") {
        return;
    }

    const { data, error } = await supabaseClient
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        applicationList.innerHTML =
            "<p>Could not load applications.</p>";
        return;
    }

    if (!data || data.length === 0) {
        applicationList.innerHTML =
            "<p>No applications found.</p>";
        return;
    }

    applicationList.innerHTML = data.map((application) => {
        const status = application.status || "Pending";

        return `
            <div class="admin-news-item">
                <span class="application-status-badge status-${status.toLowerCase()}">
                    ${status}
                </span>

                <h3>${application.student_name || "Unnamed student"}</h3>

                <p><strong>Class Applied:</strong>
                    ${application.class_applied || "Not provided"}</p>

                <p><strong>Date of Birth:</strong>
                    ${application.date_of_birth || "Not provided"}</p>

                <p><strong>Gender:</strong>
                    ${application.gender || "Not provided"}</p>

                <hr>

                <p><strong>Parent/Guardian:</strong>
                    ${application.parent_name || "Not provided"}</p>

                <p><strong>Email:</strong>
                    ${application.parent_email || "Not provided"}</p>

                <p><strong>Phone:</strong>
                    ${application.parent_phone || "Not provided"}</p>

                <p><strong>Address:</strong>
                    ${application.address || "Not provided"}</p>

                <p><strong>Previous School:</strong>
                    ${application.previous_school || "Not provided"}</p>

                <p><strong>Additional Information:</strong>
                    ${application.message || "None"}</p>

                <hr>

                <label>
                    <strong>Application Status:</strong>
                </label>

                <select class="application-status-select"
                        data-id="${application.id}">
                    <option value="Pending" ${status === "Pending" ? "selected" : ""}>
                        Pending
                    </option>
                    <option value="Accepted" ${status === "Accepted" ? "selected" : ""}>
                        Accepted
                    </option>
                    <option value="Rejected" ${status === "Rejected" ? "selected" : ""}>
                        Rejected
                    </option>
                </select>

                <div class="news-actions">
                    <button class="delete-application-btn"
                            data-id="${application.id}">
                        Delete Application
                    </button>
                </div>
            </div>
        `;
    }).join("");

    attachApplicationEvents();
}

function attachApplicationEvents() {
    document.querySelectorAll(".application-status-select")
        .forEach((select) => {
            select.addEventListener("change", async () => {
                const { error } = await supabaseClient
                    .from("applications")
                    .update({ status: select.value })
                    .eq("id", select.dataset.id);

                if (error) {
                    alert("Could not update application status.");
                    console.error(error);
                }
            });
        });

    document.querySelectorAll(".delete-application-btn")
        .forEach((button) => {
            button.addEventListener("click", async () => {
                const confirmed = confirm(
                    "Delete this application permanently?"
                );

                if (!confirmed) return;

                const { error } = await supabaseClient
                    .from("applications")
                    .delete()
                    .eq("id", button.dataset.id);

                if (error) {
                    alert("Could not delete application.");
                    console.error(error);
                    return;
                }

                loadApplications();
            });
        });
}

loadApplications();