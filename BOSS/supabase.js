// ==========================================
// SUPABASE CONNECTION
// ==========================================

const SUPABASE_URL =
    "https://xwlpsswshjxpydyzihhn.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_KF_JcuBfBywfPQNu-GclTQ_Vgi99NMP";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ==========================================
// GALLERY - PUBLIC
// ==========================================

async function loadGallery() {

    const galleryGrid =
        document.getElementById("gallery-grid");

    // Do nothing if this page has no gallery
    if (!galleryGrid) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("gallery")
            .select("*")
            .order("created_at", {
                ascending: false
            });

    if (error) {
        console.error(
            "Gallery error:",
            error
        );

        return;
    }

    galleryGrid.innerHTML = "";

    if (!data || data.length === 0) {
        galleryGrid.innerHTML =
            "<p>No images available yet.</p>";

        return;
    }

    data.forEach(item => {

        const galleryItem =
            document.createElement("div");

        galleryItem.className =
            "gallery-item";

        galleryItem.dataset.category =
            item.category;

        galleryItem.innerHTML = `
            <img
                src="${item.image_url}"
                alt="${item.title}"
            >
        `;

        galleryGrid.appendChild(
            galleryItem
        );
    });
}

loadGallery();


// ==========================================
// ADMIN LOGIN
// ==========================================

const loginForm =
    document.getElementById(
        "admin-login-form"
    );

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const email =
                document.getElementById(
                    "admin-email"
                ).value;

            const password =
                document.getElementById(
                    "admin-password"
                ).value;

            const message =
                document.getElementById(
                    "login-message"
                );

            message.textContent =
                "Logging in...";

            const { data, error } =
                await supabaseClient.auth
                    .signInWithPassword({
                        email: email,
                        password: password
                    });

            if (error) {

                message.textContent =
                    error.message;

                return;
            }

            message.textContent =
                "Login successful!";

            window.location.href =
                "admin.html";
        }
    );
}


// ==========================================
// PROTECT ADMIN PAGES
// ==========================================

async function protectAdminPage() {

    document.documentElement.style.visibility =
        "hidden";

    const {
        data: { session }
    } =
        await supabaseClient.auth
            .getSession();

    if (!session) {

        window.location.href =
            window.location.pathname.endsWith("/")
                ? "../admin-login.html"
                : "admin-login.html";

        return false;
    }

    const { data, error } =
        await supabaseClient
            .from("admin_users")
            .select("user_id")
            .eq(
                "user_id",
                session.user.id
            )
            .maybeSingle();

    if (error || !data) {

        await supabaseClient.auth
            .signOut();

        window.location.href =
            window.location.pathname.endsWith("/")
                ? "../admin-login.html"
                : "admin-login.html";

        return false;
    }

    document.documentElement.style.visibility =
        "visible";

    return true;
}


const adminPagePaths = [
    "/admin",
    "/admin/",
    "admin.html",
    "admin-gallery.html",
    "admin-news.html",
    "admin-announcements.html",
    "admin-applications.html",
    "admin-calendar.html",
    "admin-achievements.html",
    "admin-fees.html",
    "admin-curriculum.html",
    "admin-alumni.html"
];

const currentPath =
    window.location.pathname.replace(/\/$/, "") || "/";

const isAdminPage =
    currentPath === "/admin" ||
    adminPagePaths.some(
        pagePath =>
            currentPath.endsWith(pagePath)
    );

const adminAccessPromise =
    isAdminPage
        ? protectAdminPage()
        : Promise.resolve(true);

if (isAdminPage) {

    supabaseClient.auth.onAuthStateChange(
        function(event) {

            if (event === "SIGNED_OUT") {

                window.location.href =
                    window.location.pathname.endsWith("/")
                        ? "../admin-login.html"
                        : "admin-login.html";
            }
        }
    );
}

// ==========================================
// LOGOUT
// ==========================================

const logoutBtn =
    document.getElementById(
        "logout-btn"
    );

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async function() {

            const { error } =
                await supabaseClient.auth
                    .signOut();

            if (error) {

                console.error(
                    "Logout error:",
                    error
                );

                return;
            }

            window.location.href =
                "admin-login.html";
        }
    );
}


// ==========================================
// GALLERY UPLOAD - ADMIN
// ==========================================

const galleryUploadForm =
    document.getElementById(
        "gallery-upload-form"
    );

if (galleryUploadForm) {

    galleryUploadForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const title =
                document.getElementById(
                    "gallery-title"
                ).value;

            const category =
                document.getElementById(
                    "gallery-category"
                ).value;

            const imageInput =
                document.getElementById(
                    "gallery-image"
                );

            const message =
                document.getElementById(
                    "upload-message"
                );

            const file =
                imageInput.files[0];

            if (!file) {

                message.textContent =
                    "Please choose an image.";

                return;
            }

            message.textContent =
                "Uploading image...";

            const fileName =
                `${Date.now()}-${file.name}`;

            const {
                error: uploadError
            } =
                await supabaseClient
                    .storage
                    .from("school-gallery")
                    .upload(
                        fileName,
                        file
                    );

            if (uploadError) {

                console.error(
                    uploadError
                );

                message.textContent =
                    uploadError.message;

                return;
            }

            const {
                data: publicUrlData
            } =
                supabaseClient
                    .storage
                    .from("school-gallery")
                    .getPublicUrl(
                        fileName
                    );

            const imageUrl =
                publicUrlData.publicUrl;

            const {
                error: databaseError
            } =
                await supabaseClient
                    .from("gallery")
                    .insert({
                        title: title,
                        category: category,
                        image_url: imageUrl
                    });

            if (databaseError) {

                console.error(
                    databaseError
                );

                message.textContent =
                    databaseError.message;

                return;
            }

            message.textContent =
                "Image uploaded successfully!";

            galleryUploadForm.reset();

            loadAdminGallery();
        }
    );
}


// ==========================================
// ADMIN GALLERY LIST
// ==========================================

async function loadAdminGallery() {

    if (!(await adminAccessPromise)) {
        return;
    }

    const adminGalleryGrid =
        document.getElementById(
            "admin-gallery-grid"
        );

    if (!adminGalleryGrid) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("gallery")
            .select("*")
            .order("created_at", {
                ascending: false
            });

    if (error) {

        console.error(
            "Admin gallery error:",
            error
        );

        adminGalleryGrid.innerHTML =
            "<p>Could not load images.</p>";

        return;
    }

    adminGalleryGrid.innerHTML = "";

    if (!data || data.length === 0) {

        adminGalleryGrid.innerHTML =
            "<p>No images uploaded yet.</p>";

        return;
    }

    data.forEach(item => {

        const galleryItem =
            document.createElement("div");

        galleryItem.className =
            "admin-gallery-item";

        galleryItem.innerHTML = `
            <img
                src="${item.image_url}"
                alt="${item.title}"
            >

            <div class="admin-gallery-info">

                <h3>${item.title}</h3>

                <p>
                    Category: ${item.category}
                </p>

                <button
                    class="delete-gallery-btn"
                    data-id="${item.id}"
                    data-url="${item.image_url}"
                >
                    Delete
                </button>

            </div>
        `;

        adminGalleryGrid.appendChild(
            galleryItem
        );
    });
}

loadAdminGallery();


// ==========================================
// DELETE GALLERY IMAGE
// ==========================================

document.addEventListener(
    "click",
    async function(event) {

        if (
            !event.target.classList.contains(
                "delete-gallery-btn"
            )
        ) {
            return;
        }

        const button =
            event.target;

        const imageId =
            button.dataset.id;

        const imageUrl =
            button.dataset.url;

        const confirmDelete =
            confirm(
                "Are you sure you want to delete this image?"
            );

        if (!confirmDelete) {
            return;
        }

        button.textContent =
            "Deleting...";

        button.disabled = true;

        const fileName =
            imageUrl.split("/").pop();

        const {
            error: storageError
        } =
            await supabaseClient
                .storage
                .from("school-gallery")
                .remove([
                    fileName
                ]);

        if (storageError) {

            console.error(
                storageError
            );

            button.textContent =
                "Delete";

            button.disabled =
                false;

            alert(
                "Could not delete image from Storage."
            );

            return;
        }

        const {
            error: databaseError
        } =
            await supabaseClient
                .from("gallery")
                .delete()
                .eq(
                    "id",
                    imageId
                );

        if (databaseError) {

            console.error(
                databaseError
            );

            alert(
                "Image file was deleted, but the database record could not be deleted."
            );

            return;
        }

        loadAdminGallery();
    }
);


// ==========================================
// NEWS / EVENTS
// ==========================================

let editingNewsId = null;

const newsForm =
    document.getElementById(
        "news-form"
    );

if (newsForm) {

    newsForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const title =
                document.getElementById(
                    "news-title"
                ).value;

            const content =
                document.getElementById(
                    "news-content"
                ).value;

            const eventDate =
                document.getElementById(
                    "news-date"
                ).value;

            const imageInput =
                document.getElementById(
                    "news-image"
                );

            const message =
                document.getElementById(
                    "news-message"
                );

            if (editingNewsId) {

                const { error } =
                    await supabaseClient
                        .from("news")
                        .update({
                            title: title,
                            content: content,
                            event_date:
                                eventDate || null
                        })
                        .eq(
                            "id",
                            editingNewsId
                        );

                if (error) {

                    console.error(error);

                    message.textContent =
                        error.message;

                    return;
                }

                message.textContent =
                    "News updated successfully!";

                editingNewsId =
                    null;

                document.getElementById(
                    "news-submit-btn"
                ).textContent =
                    "Publish News";

                document.getElementById(
                    "cancel-edit-btn"
                ).style.display =
                    "none";

                newsForm.reset();

                loadAdminNews();

                return;
            }

            message.textContent =
                "Publishing...";

            let imageUrl = null;

            if (
                imageInput &&
                imageInput.files.length > 0
            ) {

                const file =
                    imageInput.files[0];

                const fileName =
                    `news-${Date.now()}-${file.name}`;

                const {
                    error: uploadError
                } =
                    await supabaseClient
                        .storage
                        .from("school-gallery")
                        .upload(
                            fileName,
                            file
                        );

                if (uploadError) {

                    console.error(
                        uploadError
                    );

                    message.textContent =
                        uploadError.message;

                    return;
                }

                const {
                    data: publicUrlData
                } =
                    supabaseClient
                        .storage
                        .from("school-gallery")
                        .getPublicUrl(
                            fileName
                        );

                imageUrl =
                    publicUrlData.publicUrl;
            }

            const {
                error: databaseError
            } =
                await supabaseClient
                    .from("news")
                    .insert({
                        title: title,
                        content: content,
                        event_date:
                            eventDate || null,
                        image_url:
                            imageUrl
                    });

            if (databaseError) {

                console.error(
                    databaseError
                );

                message.textContent =
                    databaseError.message;

                return;
            }

            message.textContent =
                "News published successfully!";

            newsForm.reset();

            loadAdminNews();
        }
    );
}


// ==========================================
// ADMIN NEWS LIST
// ==========================================

async function loadAdminNews() {

    if (!(await adminAccessPromise)) {
        return;
    }

    const newsList =
        document.getElementById(
            "admin-news-list"
        );

    if (!newsList) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("news")
            .select("*")
            .order("created_at", {
                ascending: false
            });

    if (error) {

        console.error(
            "Admin news error:",
            error
        );

        newsList.innerHTML =
            "<p>Could not load news.</p>";

        return;
    }

    newsList.innerHTML = "";

    if (!data || data.length === 0) {

        newsList.innerHTML =
            "<p>No news or events published yet.</p>";

        return;
    }

    data.forEach(item => {

        const newsItem =
            document.createElement("div");

        newsItem.className =
            "admin-news-item";

        newsItem.innerHTML = `

            ${
                item.image_url
                ?
                `
                <img
                    src="${item.image_url}"
                    alt="${item.title}"
                >
                `
                :
                ""
            }

            <h3>${item.title}</h3>

            ${
                item.event_date
                ?
                `
                <p class="news-date">
                    Event Date: ${item.event_date}
                </p>
                `
                :
                ""
            }

            <p class="news-content">
                ${item.content}
            </p>

            <div class="news-actions">

                <button
                    class="edit-news-btn"
                    data-id="${item.id}"
                >
                    Edit
                </button>

                <button
                    class="delete-news-btn"
                    data-id="${item.id}"
                >
                    Delete
                </button>

            </div>
        `;

        newsList.appendChild(
            newsItem
        );
    });
}

loadAdminNews();


// ==========================================
// DELETE NEWS
// ==========================================

document.addEventListener(
    "click",
    async function(event) {

        if (
            !event.target.classList.contains(
                "delete-news-btn"
            )
        ) {
            return;
        }

        const button =
            event.target;

        const newsId =
            button.dataset.id;

        if (
            !confirm(
                "Are you sure you want to delete this news/event?"
            )
        ) {
            return;
        }

        button.textContent =
            "Deleting...";

        button.disabled =
            true;

        const { error } =
            await supabaseClient
                .from("news")
                .delete()
                .eq(
                    "id",
                    newsId
                );

        if (error) {

            console.error(error);

            alert(error.message);

            button.textContent =
                "Delete";

            button.disabled =
                false;

            return;
        }

        loadAdminNews();
    }
);


// ==========================================
// EDIT NEWS
// ==========================================

document.addEventListener(
    "click",
    async function(event) {

        if (
            !event.target.classList.contains(
                "edit-news-btn"
            )
        ) {
            return;
        }

        const newsId =
            event.target.dataset.id;

        const { data, error } =
            await supabaseClient
                .from("news")
                .select("*")
                .eq(
                    "id",
                    newsId
                )
                .single();

        if (error) {

            console.error(error);

            alert(
                "Could not load this news."
            );

            return;
        }

        editingNewsId =
            newsId;

        document.getElementById(
            "news-title"
        ).value =
            data.title;

        document.getElementById(
            "news-content"
        ).value =
            data.content;

        document.getElementById(
            "news-date"
        ).value =
            data.event_date || "";

        document.getElementById(
            "news-submit-btn"
        ).textContent =
            "Update News";

        document.getElementById(
            "cancel-edit-btn"
        ).style.display =
            "inline-block";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);


const cancelEditBtn =
    document.getElementById(
        "cancel-edit-btn"
    );

if (cancelEditBtn) {

    cancelEditBtn.addEventListener(
        "click",
        function() {

            editingNewsId =
                null;

            document.getElementById(
                "news-title"
            ).value = "";

            document.getElementById(
                "news-content"
            ).value = "";

            document.getElementById(
                "news-date"
            ).value = "";

            const imageInput =
                document.getElementById(
                    "news-image"
                );

            if (imageInput) {
                imageInput.value = "";
            }

            document.getElementById(
                "news-submit-btn"
            ).textContent =
                "Publish News";

            cancelEditBtn.style.display =
                "none";

            document.getElementById(
                "news-message"
            ).textContent = "";
        }
    );
}


// ==========================================
// PUBLIC NEWS
// ==========================================

async function loadPublicNews() {

    const newsGrid =
        document.getElementById(
            "public-news-grid"
        );

    if (!newsGrid) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("news")
            .select("*")
            .order("created_at", {
                ascending: false
            });

    if (error) {

        console.error(
            "Public news error:",
            error
        );

        newsGrid.innerHTML =
            "<p>Could not load news.</p>";

        return;
    }

    newsGrid.innerHTML = "";

    if (!data || data.length === 0) {

        newsGrid.innerHTML =
            "<p>No news or events available yet.</p>";

        return;
    }

    data.forEach(item => {

        const newsCard =
            document.createElement(
                "article"
            );

        newsCard.className =
            "public-news-card";

        newsCard.innerHTML = `

            ${
                item.image_url
                ?
                `
                <img
                    src="${item.image_url}"
                    alt="${item.title}"
                >
                `
                :
                ""
            }

            <div class="public-news-info">

                <h2>${item.title}</h2>

                ${
                    item.event_date
                    ?
                    `
                    <p class="public-news-date">
                        ${item.event_date}
                    </p>
                    `
                    :
                    ""
                }

                <p class="public-news-content">
                    ${item.content}
                </p>

            </div>
        `;

        newsGrid.appendChild(
            newsCard
        );
    });
}

loadPublicNews();


// ==========================================
// DASHBOARD COUNTS
// ==========================================

async function loadDashboardCounts() {

    if (!(await adminAccessPromise)) {
        return;
    }

    const galleryCount =
        document.getElementById(
            "gallery-count"
        );

    const newsCount =
        document.getElementById(
            "news-count"
        );

    const applicationsCount =
        document.getElementById(
            "applications-count"
        );

    const achievementsCount =
        document.getElementById(
            "achievements-count"
        );

    if (
        !galleryCount &&
        !newsCount &&
        !applicationsCount &&
        !achievementsCount
    ) {
        return;
    }

    const {
        count: galleryTotal,
        error: galleryError
    } =
        await supabaseClient
            .from("gallery")
            .select("*", {
                count: "exact",
                head: true
            });

    if (
        !galleryError &&
        galleryCount
    ) {
        galleryCount.textContent =
            galleryTotal || 0;
    }

    const {
        count: newsTotal,
        error: newsError
    } =
        await supabaseClient
            .from("news")
            .select("*", {
                count: "exact",
                head: true
            });

    if (
        !newsError &&
        newsCount
    ) {
        newsCount.textContent =
            newsTotal || 0;
    }

    const {
        count: applicationsTotal,
        error: applicationsError
    } =
        await supabaseClient
            .from("applications")
            .select("*", {
                count: "exact",
                head: true
            });

    if (
        !applicationsError &&
        applicationsCount
    ) {
        applicationsCount.textContent =
            applicationsTotal || 0;
    }

    const {
        count: achievementsTotal,
        error: achievementsError
    } =
        await supabaseClient
            .from("academic_achievements")
            .select("*", {
                count: "exact",
                head: true
            });

    if (
        !achievementsError &&
        achievementsCount
    ) {
        achievementsCount.textContent =
            achievementsTotal || 0;
    }
}

loadDashboardCounts();


// ==========================================
// ANNOUNCEMENTS
// ==========================================

let editingAnnouncementId = null;

const announcementForm =
    document.getElementById(
        "announcement-form"
    );

if (announcementForm) {

    announcementForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const title =
                document.getElementById(
                    "announcement-title"
                ).value;

            const content =
                document.getElementById(
                    "announcement-content"
                ).value;

            const announcementDate =
                document.getElementById(
                    "announcement-date"
                ).value;

            const message =
                document.getElementById(
                    "announcement-message"
                );

            if (editingAnnouncementId) {

                const { error } =
                    await supabaseClient
                        .from("announcements")
                        .update({
                            title: title,
                            content: content,
                            announcement_date:
                                announcementDate ||
                                null
                        })
                        .eq(
                            "id",
                            editingAnnouncementId
                        );

                if (error) {

                    console.error(error);

                    message.textContent =
                        error.message;

                    return;
                }

                message.textContent =
                    "Announcement updated successfully!";

                editingAnnouncementId =
                    null;

                document.getElementById(
                    "announcement-submit-btn"
                ).textContent =
                    "Publish Announcement";

                document.getElementById(
                    "cancel-announcement-edit"
                ).style.display =
                    "none";

                announcementForm.reset();

                loadAdminAnnouncements();

                return;
            }

            message.textContent =
                "Publishing...";

            const { error } =
                await supabaseClient
                    .from("announcements")
                    .insert({
                        title: title,
                        content: content,
                        announcement_date:
                            announcementDate ||
                            null
                    });

            if (error) {

                console.error(error);

                message.textContent =
                    error.message;

                return;
            }

            message.textContent =
                "Announcement published successfully!";

            announcementForm.reset();

            loadAdminAnnouncements();
        }
    );
}


async function loadAdminAnnouncements() {

    if (!(await adminAccessPromise)) {
        return;
    }

    const announcementList =
        document.getElementById(
            "admin-announcement-list"
        );

    if (!announcementList) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("announcements")
            .select("*")
            .order("created_at", {
                ascending: false
            });

    if (error) {

        console.error(error);

        announcementList.innerHTML =
            "<p>Could not load announcements.</p>";

        return;
    }

    announcementList.innerHTML = "";

    if (!data || data.length === 0) {

        announcementList.innerHTML =
            "<p>No announcements published yet.</p>";

        return;
    }

    data.forEach(item => {

        const announcementItem =
            document.createElement("div");

        announcementItem.className =
            "admin-news-item";

        announcementItem.innerHTML = `

            <h3>${item.title}</h3>

            ${
                item.announcement_date
                ?
                `
                <p class="news-date">
                    Date:
                    ${item.announcement_date}
                </p>
                `
                :
                ""
            }

            <p class="news-content">
                ${item.content}
            </p>

            <div class="news-actions">

                <button
                    class="edit-announcement-btn"
                    data-id="${item.id}"
                >
                    Edit
                </button>

                <button
                    class="delete-announcement-btn"
                    data-id="${item.id}"
                >
                    Delete
                </button>

            </div>
        `;

        announcementList.appendChild(
            announcementItem
        );
    });
}

loadAdminAnnouncements();


document.addEventListener(
    "click",
    async function(event) {

        if (
            event.target.classList.contains(
                "edit-announcement-btn"
            )
        ) {

            const announcementId =
                event.target.dataset.id;

            const { data, error } =
                await supabaseClient
                    .from("announcements")
                    .select("*")
                    .eq(
                        "id",
                        announcementId
                    )
                    .single();

            if (error) {

                console.error(error);

                alert(
                    "Could not load this announcement."
                );

                return;
            }

            editingAnnouncementId =
                announcementId;

            document.getElementById(
                "announcement-title"
            ).value =
                data.title;

            document.getElementById(
                "announcement-content"
            ).value =
                data.content;

            document.getElementById(
                "announcement-date"
            ).value =
                data.announcement_date ||
                "";

            document.getElementById(
                "announcement-submit-btn"
            ).textContent =
                "Update Announcement";

            document.getElementById(
                "cancel-announcement-edit"
            ).style.display =
                "inline-block";

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }


        if (
            event.target.classList.contains(
                "delete-announcement-btn"
            )
        ) {

            const button =
                event.target;

            const announcementId =
                button.dataset.id;

            if (
                !confirm(
                    "Are you sure you want to delete this announcement?"
                )
            ) {
                return;
            }

            button.textContent =
                "Deleting...";

            button.disabled =
                true;

            const { error } =
                await supabaseClient
                    .from("announcements")
                    .delete()
                    .eq(
                        "id",
                        announcementId
                    );

            if (error) {

                console.error(error);

                alert(error.message);

                button.textContent =
                    "Delete";

                button.disabled =
                    false;

                return;
            }

            loadAdminAnnouncements();
        }
    }
);


async function loadPublicAnnouncements() {

    const announcementGrid =
        document.getElementById(
            "public-announcement-grid"
        );

    if (!announcementGrid) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("announcements")
            .select("*")
            .order("created_at", {
                ascending: false
            });

    if (error) {

        console.error(error);

        announcementGrid.innerHTML =
            "<p>Could not load announcements.</p>";

        return;
    }

    announcementGrid.innerHTML = "";

    if (!data || data.length === 0) {

        announcementGrid.innerHTML =
            "<p>No announcements available yet.</p>";

        return;
    }

    data.forEach(item => {

        const card =
            document.createElement(
                "article"
            );

        card.className =
            "public-news-card";

        card.innerHTML = `

            <div class="public-news-info">

                <h2>${item.title}</h2>

                ${
                    item.announcement_date
                    ?
                    `
                    <p class="public-news-date">
                        ${item.announcement_date}
                    </p>
                    `
                    :
                    ""
                }

                <p class="public-news-content">
                    ${item.content}
                </p>

            </div>
        `;

        announcementGrid.appendChild(
            card
        );
    });
}

loadPublicAnnouncements();


// ==========================================
// APPLICATION FORM
// ==========================================

const applicationForm =
    document.getElementById(
        "application-form"
    );

if (applicationForm) {

    applicationForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const confirmSubmit =
                confirm(
                    "Are you sure you want to submit this application?"
                );

            if (!confirmSubmit) {
                return;
            }

            const message =
                document.getElementById(
                    "application-message"
                );

            const submitButton =
                document.getElementById(
                    "application-submit"
                );

            message.textContent =
                "Submitting application...";

            submitButton.disabled =
                true;

            const studentName =
                document.getElementById(
                    "student-name"
                ).value;

            const dateOfBirth =
                document.getElementById(
                    "date-of-birth"
                ).value;

            const gender =
                document.getElementById(
                    "gender"
                ).value;

            const classApplied =
                document.getElementById(
                    "class-applied"
                ).value;

            const parentName =
                document.getElementById(
                    "parent-name"
                ).value;

            const parentEmail =
                document.getElementById(
                    "parent-email"
                ).value;

            const parentPhone =
                document.getElementById(
                    "parent-phone"
                ).value;

            const address =
                document.getElementById(
                    "address"
                ).value;

            const previousSchool =
                document.getElementById(
                    "previous-school"
                ).value;

            const additionalMessage =
                document.getElementById(
                    "message"
                ).value;

            const { error } =
                await supabaseClient
                    .from("applications")
                    .insert({
                        student_name:
                            studentName,

                        date_of_birth:
                            dateOfBirth || null,

                        gender:
                            gender || null,

                        class_applied:
                            classApplied,

                        parent_name:
                            parentName,

                        parent_email:
                            parentEmail || null,

                        parent_phone:
                            parentPhone,

                        address:
                            address || null,

                        previous_school:
                            previousSchool || null,

                        message:
                            additionalMessage || null
                    });

            if (error) {

                console.error(
                    "Application error:",
                    error
                );

                message.textContent =
                    "Could not submit application. Please try again.";

                submitButton.disabled =
                    false;

                return;
            }

            message.textContent =
                "Application submitted successfully!";

            applicationForm.reset();

            submitButton.disabled =
                false;
        }
    );
}


// ==========================================
// ADMIN APPLICATIONS
// ==========================================

async function loadAdminApplications() {

    if (!(await adminAccessPromise)) {
        return;
    }

    const applicationList =
        document.getElementById(
            "admin-application-list"
        );

    if (!applicationList) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("applications")
            .select("*")
            .order("created_at", {
                ascending: false
            });

    if (error) {

        console.error(
            "Applications error:",
            error
        );

        applicationList.innerHTML =
            "<p>Could not load applications.</p>";

        return;
    }

    applicationList.innerHTML = "";

    if (!data || data.length === 0) {

        applicationList.innerHTML =
            "<p>No applications submitted yet.</p>";

        return;
    }

    data.forEach(item => {

        const applicationItem =
            document.createElement("div");

        applicationItem.className =
            "admin-news-item";

        applicationItem.innerHTML = `

            <h3>
                ${item.student_name}
            </h3>

            <p class="application-status-badge
                status-${(
                    item.status ||
                    "Pending"
                ).toLowerCase()}">

                Status:
                ${item.status || "Pending"}

            </p>

            <p>
                <strong>
                    Class Applied:
                </strong>
                ${item.class_applied}
            </p>

            <p>
                <strong>Gender:</strong>
                ${item.gender || "Not provided"}
            </p>

            <p>
                <strong>Date of Birth:</strong>
                ${item.date_of_birth || "Not provided"}
            </p>

            <hr>

            <p>
                <strong>
                    Parent/Guardian:
                </strong>
                ${item.parent_name}
            </p>

            <p>
                <strong>Phone:</strong>
                ${item.parent_phone}
            </p>

            <p>
                <strong>Email:</strong>
                ${item.parent_email || "Not provided"}
            </p>

            <p>
                <strong>Address:</strong>
                ${item.address || "Not provided"}
            </p>

            <p>
                <strong>Previous School:</strong>
                ${item.previous_school || "Not provided"}
            </p>

            <p>
                <strong>
                    Additional Information:
                </strong>
                ${item.message || "None"}
            </p>

            <div class="news-actions">

                <select
                    class="application-status"
                    data-id="${item.id}"
                >

                    <option
                        value="Pending"
                        ${
                            item.status === "Pending"
                            ? "selected"
                            : ""
                        }
                    >
                        Pending
                    </option>

                    <option
                        value="Accepted"
                        ${
                            item.status === "Accepted"
                            ? "selected"
                            : ""
                        }
                    >
                        Accepted
                    </option>

                    <option
                        value="Rejected"
                        ${
                            item.status === "Rejected"
                            ? "selected"
                            : ""
                        }
                    >
                        Rejected
                    </option>

                </select>

                <button
                    class="delete-application-btn"
                    data-id="${item.id}"
                >
                    Delete
                </button>

            </div>
        `;

        applicationList.appendChild(
            applicationItem
        );
    });
}

loadAdminApplications();


document.addEventListener(
    "click",
    async function(event) {

        if (
            !event.target.classList.contains(
                "delete-application-btn"
            )
        ) {
            return;
        }

        const button =
            event.target;

        const applicationId =
            button.dataset.id;

        if (
            !confirm(
                "Are you sure you want to delete this application?"
            )
        ) {
            return;
        }

        button.textContent =
            "Deleting...";

        button.disabled =
            true;

        const { error } =
            await supabaseClient
                .from("applications")
                .delete()
                .eq(
                    "id",
                    applicationId
                );

        if (error) {

            console.error(error);

            alert(error.message);

            button.textContent =
                "Delete";

            button.disabled =
                false;

            return;
        }

        loadAdminApplications();
    }
);


document.addEventListener(
    "change",
    async function(event) {

        if (
            !event.target.classList.contains(
                "application-status"
            )
        ) {
            return;
        }

        const select =
            event.target;

        const applicationId =
            select.dataset.id;

        const newStatus =
            select.value;

        const { error } =
            await supabaseClient
                .from("applications")
                .update({
                    status: newStatus
                })
                .eq(
                    "id",
                    applicationId
                );

        if (error) {

            console.error(error);

            alert(
                "Could not update application status."
            );

            return;
        }

        loadAdminApplications();
    }
);


// ==========================================
// ACADEMIC CALENDAR
// ==========================================

let editingCalendarId = null;

const calendarForm =
    document.getElementById(
        "calendar-form"
    );

if (calendarForm) {

    calendarForm.addEventListener(
        "submit",
        async function(e) {

            e.preventDefault();

            const title =
                document.getElementById(
                    "calendar-title"
                ).value.trim();

            const description =
                document.getElementById(
                    "calendar-description"
                ).value.trim();

            const eventDate =
                document.getElementById(
                    "calendar-date"
                ).value;

            const message =
                document.getElementById(
                    "calendar-message"
                );

            const submitButton =
                document.getElementById(
                    "calendar-submit-btn"
                );

            if (!title || !eventDate) {

                message.textContent =
                    "Please enter the event title and date.";

                return;
            }

            if (editingCalendarId) {

                const { error } =
                    await supabaseClient
                        .from("academic_calendar")
                        .update({
                            title: title,
                            description:
                                description,
                            event_date:
                                eventDate
                        })
                        .eq(
                            "id",
                            editingCalendarId
                        );

                if (error) {

                    console.error(error);

                    message.textContent =
                        "Failed to update event.";

                    return;
                }

                message.textContent =
                    "Event updated successfully.";

            } else {

                const { error } =
                    await supabaseClient
                        .from("academic_calendar")
                        .insert([
                            {
                                title: title,
                                description:
                                    description,
                                event_date:
                                    eventDate
                            }
                        ]);

                if (error) {

                    console.error(error);

                    message.textContent =
                        "Failed to add event.";

                    return;
                }

                message.textContent =
                    "Event added successfully.";
            }

            calendarForm.reset();

            editingCalendarId =
                null;

            submitButton.textContent =
                "Add Event";

            const formTitle =
                document.getElementById(
                    "calendar-form-title"
                );

            if (formTitle) {
                formTitle.textContent =
                    "Add Academic Event";
            }

            const cancelButton =
                document.getElementById(
                    "cancel-calendar-edit"
                );

            if (cancelButton) {
                cancelButton.style.display =
                    "none";
            }

            loadAdminCalendar();
            loadPublicCalendar();
        }
    );
}


async function loadAdminCalendar() {

    if (!(await adminAccessPromise)) {
        return;
    }

    const calendarList =
        document.getElementById(
            "admin-calendar-list"
        );

    if (!calendarList) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("academic_calendar")
            .select("*")
            .order("event_date", {
                ascending: true
            });

    if (error) {

        console.error(error);

        calendarList.innerHTML =
            "<p>Failed to load calendar events.</p>";

        return;
    }

    const count =
        document.getElementById(
            "calendar-count"
        );

    if (count) {

        count.textContent =
            `${data.length} Event${
                data.length !== 1
                ? "s"
                : ""
            }`;
    }

    if (!data || data.length === 0) {

        calendarList.innerHTML = `
            <p class="empty-calendar">
                No academic events have been added yet.
            </p>
        `;

        return;
    }

    calendarList.innerHTML = "";

    data.forEach(event => {

        const date =
            new Date(
                event.event_date +
                "T00:00:00"
            );

        const formattedDate =
            date.toLocaleDateString(
                "en-US",
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );

        const eventCard =
            document.createElement(
                "div"
            );

        eventCard.className =
            "calendar-event";

        eventCard.innerHTML = `

            <div class="calendar-event-date">

                <strong>
                    ${date.getDate()}
                </strong>

                <span>
                    ${date.toLocaleDateString(
                        "en-US",
                        {
                            month: "short"
                        }
                    )}
                </span>

            </div>

            <div class="calendar-event-info">

                <h3>
                    ${event.title}
                </h3>

                <p class="calendar-full-date">
                    ${formattedDate}
                </p>

                <p>
                    ${event.description || ""}
                </p>

            </div>

            <div class="calendar-event-actions">

                <button
                    class="edit-calendar-btn"
                    data-id="${event.id}"
                >
                    Edit
                </button>

                <button
                    class="delete-calendar-btn"
                    data-id="${event.id}"
                >
                    Delete
                </button>

            </div>
        `;

        calendarList.appendChild(
            eventCard
        );
    });
}


document.addEventListener(
    "click",
    async function(e) {

        if (
            e.target.classList.contains(
                "edit-calendar-btn"
            )
        ) {

            const id =
                e.target.dataset.id;

            const { data, error } =
                await supabaseClient
                    .from("academic_calendar")
                    .select("*")
                    .eq(
                        "id",
                        id
                    )
                    .single();

            if (error) {

                console.error(error);

                return;
            }

            document.getElementById(
                "calendar-title"
            ).value =
                data.title;

            document.getElementById(
                "calendar-description"
            ).value =
                data.description || "";

            document.getElementById(
                "calendar-date"
            ).value =
                data.event_date;

            editingCalendarId =
                data.id;

            document.getElementById(
                "calendar-submit-btn"
            ).textContent =
                "Update Event";

            document.getElementById(
                "calendar-form-title"
            ).textContent =
                "Edit Academic Event";

            document.getElementById(
                "cancel-calendar-edit"
            ).style.display =
                "inline-block";

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }


        if (
            e.target.classList.contains(
                "delete-calendar-btn"
            )
        ) {

            const id =
                e.target.dataset.id;

            if (
                !confirm(
                    "Are you sure you want to delete this event?"
                )
            ) {
                return;
            }

            const { error } =
                await supabaseClient
                    .from("academic_calendar")
                    .delete()
                    .eq(
                        "id",
                        id
                    );

            if (error) {

                console.error(error);

                alert(
                    "Failed to delete event."
                );

                return;
            }

            loadAdminCalendar();
            loadPublicCalendar();
        }
    }
);


const cancelCalendarEdit =
    document.getElementById(
        "cancel-calendar-edit"
    );

if (cancelCalendarEdit) {

    cancelCalendarEdit.addEventListener(
        "click",
        function() {

            calendarForm.reset();

            editingCalendarId =
                null;

            document.getElementById(
                "calendar-form-title"
            ).textContent =
                "Add Academic Event";

            document.getElementById(
                "calendar-submit-btn"
            ).textContent =
                "Add Event";

            cancelCalendarEdit.style.display =
                "none";

            document.getElementById(
                "calendar-message"
            ).textContent =
                "";
        }
    );
}


async function loadPublicCalendar() {

    const publicCalendar =
        document.getElementById(
            "public-calendar"
        );

    if (!publicCalendar) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("academic_calendar")
            .select("*")
            .order("event_date", {
                ascending: true
            });

    if (error) {

        console.error(error);

        publicCalendar.innerHTML =
            "<p>Unable to load academic calendar.</p>";

        return;
    }

    if (!data || data.length === 0) {

        publicCalendar.innerHTML =
            "<p>No academic events available.</p>";

        return;
    }

    publicCalendar.innerHTML = "";

    data.forEach(event => {

        const date =
            new Date(
                event.event_date +
                "T00:00:00"
            );

        const formattedDate =
            date.toLocaleDateString(
                "en-US",
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );

        publicCalendar.innerHTML += `

            <div class="public-calendar-event">

                <div class="public-calendar-date">

                    <strong>
                        ${date.getDate()}
                    </strong>

                    <span>
                        ${date.toLocaleDateString(
                            "en-US",
                            {
                                month: "short"
                            }
                        )}
                    </span>

                </div>

                <div>

                    <h3>
                        ${event.title}
                    </h3>

                    <p>
                        ${formattedDate}
                    </p>

                    <p>
                        ${event.description || ""}
                    </p>

                </div>

            </div>
        `;
    });
}


if (
    document.getElementById(
        "admin-calendar-list"
    )
) {
    loadAdminCalendar();
}


if (
    document.getElementById(
        "public-calendar"
    )
) {
    loadPublicCalendar();
}


// ==========================================
// ACADEMIC ACHIEVEMENTS
// ==========================================

let editingAchievementId = null;
let currentAchievementImage = null;


async function loadAdminAchievements() {

    if (!(await adminAccessPromise)) {
        return;
    }

    const list =
        document.getElementById(
            "admin-achievements-list"
        );

    if (!list) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("academic_achievements")
            .select("*")
            .order(
                "achievement_date",
                {
                    ascending: false
                }
            );

    if (error) {

        console.error(
            "Error loading achievements:",
            error
        );

        list.innerHTML =
            "<p class='empty-achievements'>Unable to load achievements.</p>";

        return;
    }

    const count =
        document.getElementById(
            "achievement-count"
        );

    if (count) {

        count.textContent =
            `${data.length} Achievement${
                data.length !== 1
                ? "s"
                : ""
            }`;
    }

    if (!data || data.length === 0) {

        list.innerHTML = `
            <p class="empty-achievements">
                No academic achievements added yet.
            </p>
        `;

        return;
    }

    list.innerHTML =
        data.map(
            achievement => {

                let dateHTML = "";

                let fullDate = "";

                if (
                    achievement.achievement_date
                ) {

                    const date =
                        new Date(
                            achievement.achievement_date +
                            "T00:00:00"
                        );

                    const day =
                        date.getDate();

                    const month =
                        date.toLocaleString(
                            "en-US",
                            {
                                month: "short"
                            }
                        );

                    fullDate =
                        date.toLocaleDateString(
                            "en-US",
                            {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                            }
                        );

                    dateHTML = `
                        <div class="achievement-date">
                            <strong>${day}</strong>
                            <span>${month}</span>
                        </div>
                    `;

                } else {

                    dateHTML = `
                        <div class="achievement-date">
                            <strong>—</strong>
                            <span>Date</span>
                        </div>
                    `;
                }

                return `
                    <div class="admin-achievement">

                        ${dateHTML}

                        <div class="achievement-info">

                            <h3>
                                ${escapeAchievementHTML(
                                    achievement.title
                                )}
                            </h3>

                            <p>
                                ${escapeAchievementHTML(
                                    achievement.description ||
                                    "No description provided."
                                )}
                            </p>

                            ${
                                achievement.achievement_date
                                ?
                                `
                                <p class="achievement-full-date">
                                    ${fullDate}
                                </p>
                                `
                                :
                                ""
                            }

                            ${
                                achievement.image_url
                                ?
                                `
                                <img
                                    src="${achievement.image_url}"
                                    alt="${escapeAchievementHTML(
                                        achievement.title
                                    )}"
                                    class="admin-achievement-image"
                                >
                                `
                                :
                                ""
                            }

                        </div>

                        <div class="achievement-actions">

                            <button
                                class="edit-achievement-btn"
                                onclick="editAchievement('${achievement.id}')"
                            >
                                Edit
                            </button>

                            <button
                                class="delete-achievement-btn"
                                onclick="deleteAchievement('${achievement.id}')"
                            >
                                Delete
                            </button>

                        </div>

                    </div>
                `;
            }
        )
        .join("");
}


const achievementForm =
    document.getElementById(
        "achievement-form"
    );

if (achievementForm) {

    achievementForm.addEventListener(
        "submit",
        async function(e) {

            e.preventDefault();

            const title =
                document.getElementById(
                    "achievement-title"
                ).value.trim();

            const description =
                document.getElementById(
                    "achievement-description"
                ).value.trim();

            const achievementDate =
                document.getElementById(
                    "achievement-date"
                ).value;

            const imageInput =
                document.getElementById(
                    "achievement-image"
                );

            const message =
                document.getElementById(
                    "achievement-message"
                );

            const submitButton =
                document.getElementById(
                    "achievement-submit-btn"
                );

            if (!title) {

                message.textContent =
                    "Please enter an achievement title.";

                return;
            }

            submitButton.disabled =
                true;

            submitButton.textContent =
                "Saving...";

            message.textContent =
                "";

            try {

                let imageURL =
                    currentAchievementImage;

                if (
                    imageInput &&
                    imageInput.files.length > 0
                ) {

                    const file =
                        imageInput.files[0];

                    const fileExtension =
                        file.name
                            .split(".")
                            .pop();

                    const fileName =
                        `achievements/${Date.now()}.${fileExtension}`;

                    const {
                        error: uploadError
                    } =
                        await supabaseClient
                            .storage
                            .from(
                                "school-gallery"
                            )
                            .upload(
                                fileName,
                                file,
                                {
                                    cacheControl:
                                        "3600",
                                    upsert:
                                        false
                                }
                            );

                    if (uploadError) {
                        throw uploadError;
                    }

                    const {
                        data:
                            publicURLData
                    } =
                        supabaseClient
                            .storage
                            .from(
                                "school-gallery"
                            )
                            .getPublicUrl(
                                fileName
                            );

                    imageURL =
                        publicURLData.publicUrl;
                }

                if (editingAchievementId) {

                    const { error } =
                        await supabaseClient
                            .from(
                                "academic_achievements"
                            )
                            .update({
                                title:
                                    title,
                                description:
                                    description,
                                achievement_date:
                                    achievementDate ||
                                    null,
                                image_url:
                                    imageURL
                            })
                            .eq(
                                "id",
                                editingAchievementId
                            );

                    if (error) {
                        throw error;
                    }

                    message.textContent =
                        "Achievement updated successfully.";

                } else {

                    const { error } =
                        await supabaseClient
                            .from(
                                "academic_achievements"
                            )
                            .insert({
                                title:
                                    title,
                                description:
                                    description,
                                achievement_date:
                                    achievementDate ||
                                    null,
                                image_url:
                                    imageURL
                            });

                    if (error) {
                        throw error;
                    }

                    message.textContent =
                        "Achievement added successfully.";
                }

                resetAchievementForm();

                await loadAdminAchievements();

            } catch (error) {

                console.error(
                    "Achievement error:",
                    error
                );

                message.textContent =
                    error.message ||
                    "Something went wrong.";
            }

            submitButton.disabled =
                false;

            submitButton.textContent =
                editingAchievementId
                ? "Update Achievement"
                : "Add Achievement";
        }
    );
}


async function editAchievement(id) {

    const { data, error } =
        await supabaseClient
            .from(
                "academic_achievements"
            )
            .select("*")
            .eq(
                "id",
                id
            )
            .single();

    if (error) {

        console.error(error);

        alert(
            "Unable to load achievement."
        );

        return;
    }

    editingAchievementId =
        id;

    currentAchievementImage =
        data.image_url || null;

    document.getElementById(
        "achievement-title"
    ).value =
        data.title || "";

    document.getElementById(
        "achievement-description"
    ).value =
        data.description || "";

    document.getElementById(
        "achievement-date"
    ).value =
        data.achievement_date || "";

    document.getElementById(
        "achievement-form-title"
    ).textContent =
        "Edit Academic Achievement";

    document.getElementById(
        "achievement-submit-btn"
    ).textContent =
        "Update Achievement";

    document.getElementById(
        "cancel-achievement-edit"
    ).style.display =
        "inline-block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


async function deleteAchievement(id) {

    if (
        !confirm(
            "Are you sure you want to delete this achievement?"
        )
    ) {
        return;
    }

    const { error } =
        await supabaseClient
            .from(
                "academic_achievements"
            )
            .delete()
            .eq(
                "id",
                id
            );

    if (error) {

        console.error(error);

        alert(
            "Unable to delete achievement."
        );

        return;
    }

    await loadAdminAchievements();
}


function resetAchievementForm() {

    editingAchievementId =
        null;

    currentAchievementImage =
        null;

    const form =
        document.getElementById(
            "achievement-form"
        );

    if (form) {
        form.reset();
    }

    const title =
        document.getElementById(
            "achievement-form-title"
        );

    if (title) {
        title.textContent =
            "Add Academic Achievement";
    }

    const button =
        document.getElementById(
            "achievement-submit-btn"
        );

    if (button) {
        button.textContent =
            "Add Achievement";
    }

    const cancel =
        document.getElementById(
            "cancel-achievement-edit"
        );

    if (cancel) {
        cancel.style.display =
            "none";
    }
}


const cancelAchievementEdit =
    document.getElementById(
        "cancel-achievement-edit"
    );

if (cancelAchievementEdit) {

    cancelAchievementEdit.addEventListener(
        "click",
        function() {

            resetAchievementForm();
        }
    );
}


function escapeAchievementHTML(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}


if (
    document.getElementById(
        "admin-achievements-list"
    )
) {
    loadAdminAchievements();
}


// ==========================================
// PUBLIC ACADEMIC ACHIEVEMENTS
// ==========================================

async function loadPublicAchievements() {

    const container =
        document.getElementById(
            "public-achievements"
        );

    if (!container) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from(
                "academic_achievements"
            )
            .select("*")
            .order(
                "achievement_date",
                {
                    ascending: false
                }
            );

    if (error) {

        console.error(
            "Error loading public achievements:",
            error
        );

        container.innerHTML = `
            <p class="achievements-loading">
                Unable to load academic achievements.
            </p>
        `;

        return;
    }

    if (!data || data.length === 0) {

        container.innerHTML = `
            <p class="achievements-loading">
                No academic achievements available yet.
            </p>
        `;

        return;
    }

    container.innerHTML =
        data.map(
            achievement => {

                let dateHTML = "";

                if (
                    achievement.achievement_date
                ) {

                    const date =
                        new Date(
                            achievement.achievement_date +
                            "T00:00:00"
                        );

                    dateHTML = `
                        <div class="public-achievement-date">

                            <strong>
                                ${date.getDate()}
                            </strong>

                            <span>
                                ${date.toLocaleString(
                                    "en-US",
                                    {
                                        month: "short"
                                    }
                                )}
                            </span>

                        </div>
                    `;
                }

                return `
                    <article class="public-achievement-card">

                        ${
                            achievement.image_url
                            ?
                            `
                            <div class="public-achievement-image">

                                <img
                                    src="${achievement.image_url}"
                                    alt="${escapeAchievementHTML(
                                        achievement.title
                                    )}"
                                >

                            </div>
                            `
                            :
                            ""
                        }

                        <div class="public-achievement-content">

                            ${dateHTML}

                            <div class="public-achievement-text">

                                <h2>
                                    ${escapeAchievementHTML(
                                        achievement.title
                                    )}
                                </h2>

                                ${
                                    achievement.description
                                    ?
                                    `
                                    <p>
                                        ${escapeAchievementHTML(
                                            achievement.description
                                        )}
                                    </p>
                                    `
                                    :
                                    ""
                                }

                                ${
                                    achievement.achievement_date
                                    ?
                                    `
                                    <span class="public-achievement-full-date">

                                        ${new Date(
                                            achievement.achievement_date +
                                            "T00:00:00"
                                        ).toLocaleDateString(
                                            "en-US",
                                            {
                                                year:
                                                    "numeric",
                                                month:
                                                    "long",
                                                day:
                                                    "numeric"
                                            }
                                        )}

                                    </span>
                                    `
                                    :
                                    ""
                                }

                            </div>

                        </div>

                    </article>
                `;
            }
        )
        .join("");
}


if (
    document.getElementById(
        "public-achievements"
    )
) {
    loadPublicAchievements();
}


// ==========================================
// SCHOOL FEES - ADMIN
// ==========================================

let editingFeeId = null;


async function loadAdminFees() {

    if (!(await adminAccessPromise)) {
        return;
    }

    const list =
        document.getElementById(
            "admin-fees-list"
        );

    if (!list) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("school_fees")
            .select("*")
            .order(
                "class_name",
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(
            "Error loading school fees:",
            error
        );

        list.innerHTML = `
            <p class="empty-fees">
                Unable to load school fees.
            </p>
        `;

        return;
    }

    const count =
        document.getElementById(
            "fee-count"
        );

    if (count) {

        count.textContent =
            `${data.length} Class${
                data.length !== 1
                ? "es"
                : ""
            }`;
    }

    if (!data || data.length === 0) {

        list.innerHTML = `
            <p class="empty-fees">
                No school fees added yet.
            </p>
        `;

        return;
    }

    list.innerHTML =
        data.map(
            fee => {

                const tuition =
                    Number(
                        fee.tuition_fee || 0
                    );

                const admission =
                    Number(
                        fee.admission_fee || 0
                    );

                const other =
                    Number(
                        fee.other_fees || 0
                    );

                const total =
                    tuition +
                    admission +
                    other;

                return `
                    <div class="admin-fee-item">

                        <div class="fee-class">

                            <h3>
                                ${escapeAchievementHTML(
                                    fee.class_name
                                )}
                            </h3>

                            <p>
                                ${escapeAchievementHTML(
                                    fee.description ||
                                    "No additional information."
                                )}
                            </p>

                        </div>

                        <div class="fee-details">

                            <div>
                                <span>
                                    Tuition
                                </span>

                                <strong>
                                    ₦${tuition.toLocaleString()}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Admission
                                </span>

                                <strong>
                                    ₦${admission.toLocaleString()}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Other
                                </span>

                                <strong>
                                    ₦${other.toLocaleString()}
                                </strong>
                            </div>

                            <div class="fee-total">

                                <span>
                                    Total
                                </span>

                                <strong>
                                    ₦${total.toLocaleString()}
                                </strong>

                            </div>

                        </div>

                        <div class="fee-actions">

                            <button
                                class="edit-fee-btn"
                                onclick="editSchoolFee('${fee.id}')"
                            >
                                Edit
                            </button>

                            <button
                                class="delete-fee-btn"
                                onclick="deleteSchoolFee('${fee.id}')"
                            >
                                Delete
                            </button>

                        </div>

                    </div>
                `;
            }
        )
        .join("");
}


const feeForm =
    document.getElementById(
        "fee-form"
    );

if (feeForm) {

    feeForm.addEventListener(
        "submit",
        async function(e) {

            e.preventDefault();

            const className =
                document.getElementById(
                    "class-name"
                ).value.trim();

            const tuitionFee =
                Number(
                    document.getElementById(
                        "tuition-fee"
                    ).value
                ) || 0;

            const admissionFee =
                Number(
                    document.getElementById(
                        "admission-fee"
                    ).value
                ) || 0;

            const otherFees =
                Number(
                    document.getElementById(
                        "other-fees"
                    ).value
                ) || 0;

            const description =
                document.getElementById(
                    "fee-description"
                ).value.trim();

            const message =
                document.getElementById(
                    "fee-message"
                );

            const submitButton =
                document.getElementById(
                    "fee-submit-btn"
                );

            if (!className) {

                message.textContent =
                    "Please enter the class or level.";

                return;
            }

            submitButton.disabled =
                true;

            submitButton.textContent =
                "Saving...";

            try {

                const feeData = {
                    class_name:
                        className,
                    tuition_fee:
                        tuitionFee,
                    admission_fee:
                        admissionFee,
                    other_fees:
                        otherFees,
                    description:
                        description
                };

                if (editingFeeId) {

                    const { error } =
                        await supabaseClient
                            .from(
                                "school_fees"
                            )
                            .update(
                                feeData
                            )
                            .eq(
                                "id",
                                editingFeeId
                            );

                    if (error) {
                        throw error;
                    }

                    message.textContent =
                        "School fee updated successfully.";

                } else {

                    const { error } =
                        await supabaseClient
                            .from(
                                "school_fees"
                            )
                            .insert(
                                feeData
                            );

                    if (error) {
                        throw error;
                    }

                    message.textContent =
                        "School fee added successfully.";
                }

                resetFeeForm();

                await loadAdminFees();

            } catch (error) {

                console.error(
                    "School fee error:",
                    error
                );

                message.textContent =
                    error.message ||
                    "Something went wrong.";
            }

            submitButton.disabled =
                false;

            submitButton.textContent =
                editingFeeId
                ? "Update School Fee"
                : "Add School Fee";
        }
    );
}


async function editSchoolFee(id) {

    const { data, error } =
        await supabaseClient
            .from("school_fees")
            .select("*")
            .eq(
                "id",
                id
            )
            .single();

    if (error) {

        console.error(error);

        alert(
            "Unable to load school fee."
        );

        return;
    }

    editingFeeId =
        id;

    document.getElementById(
        "class-name"
    ).value =
        data.class_name || "";

    document.getElementById(
        "tuition-fee"
    ).value =
        data.tuition_fee || 0;

    document.getElementById(
        "admission-fee"
    ).value =
        data.admission_fee || 0;

    document.getElementById(
        "other-fees"
    ).value =
        data.other_fees || 0;

    document.getElementById(
        "fee-description"
    ).value =
        data.description || "";

    document.getElementById(
        "fee-form-title"
    ).textContent =
        "Edit School Fee";

    document.getElementById(
        "fee-submit-btn"
    ).textContent =
        "Update School Fee";

    document.getElementById(
        "cancel-fee-edit"
    ).style.display =
        "inline-block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


async function deleteSchoolFee(id) {

    if (
        !confirm(
            "Are you sure you want to delete this school fee?"
        )
    ) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("school_fees")
            .delete()
            .eq(
                "id",
                id
            );

    if (error) {

        console.error(error);

        alert(
            "Unable to delete school fee."
        );

        return;
    }

    await loadAdminFees();
}


function resetFeeForm() {

    editingFeeId =
        null;

    const form =
        document.getElementById(
            "fee-form"
        );

    if (form) {
        form.reset();
    }

    const admission =
        document.getElementById(
            "admission-fee"
        );

    if (admission) {
        admission.value = 0;
    }

    const other =
        document.getElementById(
            "other-fees"
        );

    if (other) {
        other.value = 0;
    }

    document.getElementById(
        "fee-form-title"
    ).textContent =
        "Add School Fee";

    document.getElementById(
        "fee-submit-btn"
    ).textContent =
        "Add School Fee";

    document.getElementById(
        "cancel-fee-edit"
    ).style.display =
        "none";
}


const cancelFeeEdit =
    document.getElementById(
        "cancel-fee-edit"
    );

if (cancelFeeEdit) {

    cancelFeeEdit.addEventListener(
        "click",
        function() {

            resetFeeForm();
        }
    );
}


if (
    document.getElementById(
        "admin-fees-list"
    )
) {
    loadAdminFees();
}


// ==========================================
// SCHOOL FEES - PUBLIC
// ==========================================

async function loadPublicFees() {

    const container =
        document.getElementById(
            "public-fees"
        );

    if (!container) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("school_fees")
            .select("*")
            .order(
                "class_name",
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(
            "Error loading public school fees:",
            error
        );

        container.innerHTML = `
            <p class="fees-loading">
                Unable to load school fees.
            </p>
        `;

        return;
    }

    if (!data || data.length === 0) {

        container.innerHTML = `
            <p class="fees-loading">
                School fees are not available yet.
            </p>
        `;

        return;
    }

    container.innerHTML =
        data.map(
            fee => {

                const tuition =
                    Number(
                        fee.tuition_fee || 0
                    );

                const admission =
                    Number(
                        fee.admission_fee || 0
                    );

                const other =
                    Number(
                        fee.other_fees || 0
                    );

                const total =
                    tuition +
                    admission +
                    other;

                return `

                    <article class="public-fee-card">

                        <div class="public-fee-header">

                            <h2>
                                ${escapeAchievementHTML(
                                    fee.class_name
                                )}
                            </h2>

                            <span>
                                School Fees
                            </span>

                        </div>

                        <div class="public-fee-details">

                            <div>

                                <span>
                                    Tuition Fee
                                </span>

                                <strong>
                                    ₦${tuition.toLocaleString()}
                                </strong>

                            </div>

                            <div>

                                <span>
                                    Admission Fee
                                </span>

                                <strong>
                                    ₦${admission.toLocaleString()}
                                </strong>

                            </div>

                            <div>

                                <span>
                                    Other Fees
                                </span>

                                <strong>
                                    ₦${other.toLocaleString()}
                                </strong>

                            </div>

                        </div>

                        <div class="public-fee-total">

                            <span>
                                Total
                            </span>

                            <strong>
                                ₦${total.toLocaleString()}
                            </strong>

                        </div>

                        ${
                            fee.description
                            ?
                            `
                            <p class="public-fee-description">
                                ${escapeAchievementHTML(
                                    fee.description
                                )}
                            </p>
                            `
                            :
                            ""
                        }

                    </article>
                `;
            }
        )
        .join("");
}


if (
    document.getElementById(
        "public-fees"
    )
) {
    loadPublicFees();
}


// ==========================================
// CURRICULUM - ADMIN
// ==========================================

async function setupAdminCurriculum() {

    if (!(await adminAccessPromise)) {
        return;
    }

    const subjectsContainer =
        document.getElementById(
            "subjects-container"
        );

    const saveButton =
        document.getElementById(
            "save-curriculum"
        );

    const message =
        document.getElementById(
            "curriculum-message"
        );

    const savedCurriculums =
        document.getElementById(
            "saved-curriculums"
        );

    // IMPORTANT:
    // If we are not on admin-curriculum.html,
    // stop here.

    if (
        !subjectsContainer ||
        !saveButton ||
        !message ||
        !savedCurriculums
    ) {
        return;
    }


    // ==========================================
    // CREATE 15 SUBJECT BOXES
    // ==========================================

    subjectsContainer.innerHTML = "";

    for (
        let i = 1;
        i <= 15;
        i++
    ) {

        const box =
            document.createElement(
                "div"
            );

        box.className =
            "subject-box";

        box.innerHTML = `

            <h2>
                Subject ${i}
            </h2>

            <div class="form-group">

                <label>
                    Subject Name
                </label>

                <input
                    type="text"
                    id="subject-${i}"
                    placeholder="e.g. Mathematics"
                >

            </div>

            <div class="terms">

                <div class="term">

                    <label>
                        First Term Outline
                    </label>

                    <textarea
                        id="first-${i}"
                        placeholder="Enter First Term topics..."
                    ></textarea>

                </div>

                <div class="term">

                    <label>
                        Second Term Outline
                    </label>

                    <textarea
                        id="second-${i}"
                        placeholder="Enter Second Term topics..."
                    ></textarea>

                </div>

                <div class="term">

                    <label>
                        Third Term Outline
                    </label>

                    <textarea
                        id="third-${i}"
                        placeholder="Enter Third Term topics..."
                    ></textarea>

                </div>

            </div>
        `;

        subjectsContainer.appendChild(
            box
        );
    }


    // ==========================================
    // SAVE CURRICULUM
    // ==========================================

    saveButton.addEventListener(
        "click",
        async function() {

            const classLevel =
                document.getElementById(
                    "class-level"
                ).value;

            const academicSession =
                document.getElementById(
                    "academic-session"
                ).value.trim();

            if (
                !classLevel ||
                !academicSession
            ) {

                message.textContent =
                    "Please select a class and enter the academic session.";

                return;
            }

            const curriculum = {

                class_level:
                    classLevel,

                academic_session:
                    academicSession
            };


            for (
                let i = 1;
                i <= 15;
                i++
            ) {

                curriculum[
                    `subject_${i}`
                ] =
                    document.getElementById(
                        `subject-${i}`
                    ).value.trim();

                curriculum[
                    `subject_${i}_first_term`
                ] =
                    document.getElementById(
                        `first-${i}`
                    ).value.trim();

                curriculum[
                    `subject_${i}_second_term`
                ] =
                    document.getElementById(
                        `second-${i}`
                    ).value.trim();

                curriculum[
                    `subject_${i}_third_term`
                ] =
                    document.getElementById(
                        `third-${i}`
                    ).value.trim();
            }

            message.textContent =
                "Saving curriculum...";

            const { error } =
                await supabaseClient
                    .from("curriculum")
                    .insert([
                        curriculum
                    ]);

            if (error) {

                console.error(
                    "Curriculum save error:",
                    error
                );

                message.textContent =
                    error.message;

                return;
            }

            message.textContent =
                "Curriculum saved successfully!";

            clearCurriculumForm();

            loadCurriculums();
        }
    );


    // ==========================================
    // CLEAR CURRICULUM FORM
    // ==========================================

    function clearCurriculumForm() {

        document.getElementById(
            "class-level"
        ).value = "";

        document.getElementById(
            "academic-session"
        ).value = "";

        for (
            let i = 1;
            i <= 15;
            i++
        ) {

            document.getElementById(
                `subject-${i}`
            ).value = "";

            document.getElementById(
                `first-${i}`
            ).value = "";

            document.getElementById(
                `second-${i}`
            ).value = "";

            document.getElementById(
                `third-${i}`
            ).value = "";
        }
    }


    // ==========================================
    // LOAD SAVED CURRICULUMS
    // ==========================================

    async function loadCurriculums() {

        const { data, error } =
            await supabaseClient
                .from("curriculum")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {

            console.error(
                "Curriculum loading error:",
                error
            );

            savedCurriculums.innerHTML =
                "<p>Unable to load curriculums.</p>";

            return;
        }

        savedCurriculums.innerHTML =
            "";

        if (
            !data ||
            data.length === 0
        ) {

            savedCurriculums.innerHTML =
                "<p>No curriculum added yet.</p>";

            return;
        }

        data.forEach(
            curriculum => {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "saved-curriculum-card";

                let subjects = "";

                for (
                    let i = 1;
                    i <= 15;
                    i++
                ) {

                    const subject =
                        curriculum[
                            `subject_${i}`
                        ];

                    if (!subject) {
                        continue;
                    }

                    subjects += `

                        <div class="saved-subject">

                            <h3>
                                ${escapeAchievementHTML(
                                    subject
                                )}
                            </h3>

                            <details>

                                <summary>
                                    First Term
                                </summary>

                                <p>
                                    ${
                                        escapeAchievementHTML(
                                            curriculum[
                                                `subject_${i}_first_term`
                                            ] ||
                                            "No outline added."
                                        )
                                    }
                                </p>

                            </details>

                            <details>

                                <summary>
                                    Second Term
                                </summary>

                                <p>
                                    ${
                                        escapeAchievementHTML(
                                            curriculum[
                                                `subject_${i}_second_term`
                                            ] ||
                                            "No outline added."
                                        )
                                    }
                                </p>

                            </details>

                            <details>

                                <summary>
                                    Third Term
                                </summary>

                                <p>
                                    ${
                                        escapeAchievementHTML(
                                            curriculum[
                                                `subject_${i}_third_term`
                                            ] ||
                                            "No outline added."
                                        )
                                    }
                                </p>

                            </details>

                        </div>
                    `;
                }

                card.innerHTML = `

                    <div class="saved-header">

                        <div>

                            <h2>
                                ${escapeAchievementHTML(
                                    curriculum.class_level
                                )}
                            </h2>

                            <p>
                                Academic Session:
                                ${escapeAchievementHTML(
                                    curriculum.academic_session
                                )}
                            </p>

                        </div>

                        <button
                            class="delete-btn"
                            onclick="deleteCurriculum(${curriculum.id})"
                        >
                            Delete
                        </button>

                    </div>

                    <div class="saved-subjects">

                        ${subjects}

                    </div>
                `;

                savedCurriculums.appendChild(
                    card
                );
            }
        );
    }


    // ==========================================
    // DELETE CURRICULUM
    // ==========================================

    window.deleteCurriculum =
        async function(id) {

            if (
                !confirm(
                    "Are you sure you want to delete this curriculum?"
                )
            ) {
                return;
            }

            const { error } =
                await supabaseClient
                    .from("curriculum")
                    .delete()
                    .eq(
                        "id",
                        id
                    );

            if (error) {

                console.error(
                    "Delete error:",
                    error
                );

                alert(
                    "Could not delete curriculum."
                );

                return;
            }

            loadCurriculums();
        };


    // Initial load
    loadCurriculums();
}


// ==========================================
// START ADMIN CURRICULUM
// ==========================================

if (
    document.getElementById(
        "subjects-container"
    )
) {

    setupAdminCurriculum();
}


// ==========================================
// CURRICULUM - PUBLIC
// ==========================================

async function setupPublicCurriculum() {

    const curriculumContent =
        document.getElementById(
            "curriculum-content"
        );

    const classFilter =
        document.getElementById(
            "class-filter"
        );

    // IMPORTANT:
    // If we are not on curriculum.html,
    // stop here.

    if (
        !curriculumContent ||
        !classFilter
    ) {
        return;
    }

    let allCurriculums = [];


    // ==========================================
    // LOAD CURRICULUM
    // ==========================================

    async function loadCurriculum() {

        const { data, error } =
            await supabaseClient
                .from("curriculum")
                .select("*")
                .order(
                    "class_level",
                    {
                        ascending: true
                    }
                );

        if (error) {

            console.error(
                "Curriculum error:",
                error
            );

            curriculumContent.innerHTML = `
                <p class="error-message">
                    Unable to load curriculum.
                </p>
            `;

            return;
        }

        allCurriculums =
            data || [];

        displayCurriculum(
            allCurriculums
        );
    }


    // ==========================================
    // DISPLAY CURRICULUM
    // ==========================================

    function displayCurriculum(
        curriculums
    ) {

        curriculumContent.innerHTML =
            "";

        if (
            !curriculums ||
            curriculums.length === 0
        ) {

            curriculumContent.innerHTML = `
                <p class="empty-message">
                    No curriculum available yet.
                </p>
            `;

            return;
        }

        curriculums.forEach(
            curriculum => {

                const classBox =
                    document.createElement(
                        "section"
                    );

                classBox.className =
                    "curriculum-class";

                let subjectsHTML =
                    "";

                for (
                    let i = 1;
                    i <= 15;
                    i++
                ) {

                    const subject =
                        curriculum[
                            `subject_${i}`
                        ];

                    if (!subject) {
                        continue;
                    }

                    const firstTerm =
                        curriculum[
                            `subject_${i}_first_term`
                        ] ||
                        "No outline available.";

                    const secondTerm =
                        curriculum[
                            `subject_${i}_second_term`
                        ] ||
                        "No outline available.";

                    const thirdTerm =
                        curriculum[
                            `subject_${i}_third_term`
                        ] ||
                        "No outline available.";

                    subjectsHTML += `

                        <article class="subject-card">

                            <h3>
                                ${escapeAchievementHTML(
                                    subject
                                )}
                            </h3>

                            <details>

                                <summary>
                                    First Term
                                </summary>

                                <div class="outline">
                                    ${formatCurriculumOutline(
                                        firstTerm
                                    )}
                                </div>

                            </details>

                            <details>

                                <summary>
                                    Second Term
                                </summary>

                                <div class="outline">
                                    ${formatCurriculumOutline(
                                        secondTerm
                                    )}
                                </div>

                            </details>

                            <details>

                                <summary>
                                    Third Term
                                </summary>

                                <div class="outline">
                                    ${formatCurriculumOutline(
                                        thirdTerm
                                    )}
                                </div>

                            </details>

                        </article>
                    `;
                }

                classBox.innerHTML = `

                    <div class="class-heading">

                        <div>

                            <span>
                                ACADEMIC SESSION
                            </span>

                            <h2>
                                ${escapeAchievementHTML(
                                    curriculum.class_level
                                )}
                            </h2>

                        </div>

                        <p>
                            ${escapeAchievementHTML(
                                curriculum.academic_session
                            )}
                        </p>

                    </div>

                    <div class="subjects-grid">

                        ${subjectsHTML}

                    </div>
                `;

                curriculumContent.appendChild(
                    classBox
                );
            }
        );
    }


    // ==========================================
    // FORMAT OUTLINE
    // ==========================================

    function formatCurriculumOutline(
        text
    ) {

        return escapeAchievementHTML(
            text
        ).replace(
            /\n/g,
            "<br>"
        );
    }


    // ==========================================
    // CLASS FILTER
    // ==========================================

    classFilter.addEventListener(
        "change",
        function() {

            const selectedClass =
                this.value;

            if (
                selectedClass ===
                "all"
            ) {

                displayCurriculum(
                    allCurriculums
                );

                return;
            }

            const filtered =
                allCurriculums.filter(
                    curriculum =>
                        curriculum.class_level ===
                        selectedClass
                );

            displayCurriculum(
                filtered
            );
        }
    );


    // Initial load
    loadCurriculum();
}


// ==========================================
// START PUBLIC CURRICULUM
// ==========================================

if (
    document.getElementById(
        "curriculum-content"
    )
) {

    setupPublicCurriculum();
}





// ==========================================
// ALUMNI STORIES - ADMIN
// ==========================================

async function setupAdminAlumni() {

    if (!(await adminAccessPromise)) {
        return;
    }

    const alumniName =
        document.getElementById("alumni-name");

    const graduationYear =
        document.getElementById("graduation-year");

    const profession =
        document.getElementById("profession");

    const story =
        document.getElementById("story");

    const alumniImage =
        document.getElementById("alumni-image");

    const imagePreview =
        document.getElementById("alumni-image-preview");

    const saveButton =
        document.getElementById("save-alumni");

    const cancelButton =
        document.getElementById("cancel-alumni-edit");

    const message =
        document.getElementById("alumni-message");

    const savedAlumni =
        document.getElementById("saved-alumni");


    // IMPORTANT:
    // Stop if we are not on admin-alumni.html

    if (
        !alumniName ||
        !graduationYear ||
        !profession ||
        !story ||
        !alumniImage ||
        !saveButton ||
        !message ||
        !savedAlumni
    ) {
        return;
    }


    let editingAlumniId = null;

    let existingImageUrl = null;


    // ==========================================
    // IMAGE PREVIEW
    // ==========================================

    alumniImage.addEventListener(
        "change",
        function () {

            const file =
                this.files[0];

            if (!file) {
                return;
            }


            if (!file.type.startsWith("image/")) {

                message.textContent =
                    "Please select an image file.";

                this.value = "";

                return;
            }


            const reader =
                new FileReader();

            reader.onload =
                function (event) {

                    imagePreview.innerHTML = `
                        <img
                            src="${event.target.result}"
                            alt="Alumni Preview"
                            style="
                                width:150px;
                                height:150px;
                                object-fit:cover;
                                margin-top:10px;
                                border-radius:8px;
                            "
                        >
                    `;

                };

            reader.readAsDataURL(file);

        }
    );


    // ==========================================
    // SAVE / UPDATE ALUMNI
    // ==========================================

    saveButton.addEventListener(
        "click",
        async function () {

            const name =
                alumniName.value.trim();

            const year =
                graduationYear.value.trim();

            const role =
                profession.value.trim();

            const alumniStory =
                story.value.trim();


            // ==================================
            // VALIDATION
            // ==================================

            if (!name) {

                message.textContent =
                    "Please enter the alumni name.";

                return;
            }


            if (!alumniStory) {

                message.textContent =
                    "Please enter the alumni story.";

                return;
            }


            message.textContent =
                "Saving alumni story...";

            saveButton.disabled = true;


            try {

                let imageUrl =
                    existingImageUrl;


                // ==================================
                // UPLOAD NEW IMAGE
                // ==================================

                const file =
                    alumniImage.files[0];


                if (file) {

                    const fileExtension =
                        file.name
                            .split(".")
                            .pop()
                            .toLowerCase();


                    const fileName =
                        `alumni/${Date.now()}-${Math.random()
                            .toString(36)
                            .substring(2)}.${fileExtension}`;


                    const {
                        error: uploadError
                    } = await supabaseClient
                        .storage
                        .from("school-gallery")
                        .upload(
                            fileName,
                            file,
                            {
                                upsert: false
                            }
                        );


                    if (uploadError) {

                        console.error(
                            "Alumni image upload error:",
                            uploadError
                        );

                        message.textContent =
                            "Image upload failed: " +
                            uploadError.message;

                        return;
                    }


                    // GET PUBLIC URL

                    const {
                        data: publicUrlData
                    } =
                        supabaseClient
                            .storage
                            .from("school-gallery")
                            .getPublicUrl(
                                fileName
                            );


                    imageUrl =
                        publicUrlData.publicUrl;
                }


                // ==================================
                // ALUMNI DATA
                // ==================================

                const alumniData = {

                    alumni_name:
                        name,

                    graduation_year:
                        year || null,

                    profession:
                        role || null,

                    story:
                        alumniStory,

                    image_url:
                        imageUrl || null

                };


                let result;


                // ==================================
                // UPDATE
                // ==================================

                if (editingAlumniId) {

                    result =
                        await supabaseClient
                            .from("alumni")
                            .update(alumniData)
                            .eq(
                                "id",
                                editingAlumniId
                            );

                }


                // ==================================
                // INSERT
                // ==================================

                else {

                    result =
                        await supabaseClient
                            .from("alumni")
                            .insert([
                                alumniData
                            ]);

                }


                if (result.error) {

                    console.error(
                        "Alumni save error:",
                        result.error
                    );

                    message.textContent =
                        result.error.message;

                    return;
                }


                // ==================================
                // SUCCESS
                // ==================================

                message.textContent =
                    editingAlumniId
                        ? "Alumni story updated successfully!"
                        : "Alumni story saved successfully!";


                clearAlumniForm();


                editingAlumniId =
                    null;

                existingImageUrl =
                    null;


                saveButton.textContent =
                    "Save Alumni Story";


                if (cancelButton) {

                    cancelButton.style.display =
                        "none";

                }


                loadAlumniStories();

            }

            catch (error) {

                console.error(
                    "Alumni error:",
                    error
                );

                message.textContent =
                    "Something went wrong.";

            }

            finally {

                saveButton.disabled =
                    false;

            }

        }
    );


    // ==========================================
    // CLEAR FORM
    // ==========================================

    function clearAlumniForm() {

        alumniName.value =
            "";

        graduationYear.value =
            "";

        profession.value =
            "";

        story.value =
            "";

        alumniImage.value =
            "";

        imagePreview.innerHTML =
            "";

    }


    // ==========================================
    // CANCEL EDIT
    // ==========================================

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            function () {

                editingAlumniId =
                    null;

                existingImageUrl =
                    null;

                clearAlumniForm();


                saveButton.textContent =
                    "Save Alumni Story";


                cancelButton.style.display =
                    "none";


                message.textContent =
                    "Edit cancelled.";

            }
        );

    }


    // ==========================================
    // LOAD SAVED ALUMNI STORIES
    // ==========================================

    async function loadAlumniStories() {

        const {
            data,
            error
        } = await supabaseClient
            .from("alumni")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "Alumni loading error:",
                error
            );

            savedAlumni.innerHTML =
                "<p>Unable to load alumni stories.</p>";

            return;
        }


        savedAlumni.innerHTML =
            "";


        if (
            !data ||
            data.length === 0
        ) {

            savedAlumni.innerHTML =
                "<p>No alumni stories added yet.</p>";

            return;
        }


        data.forEach(
            alumni => {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "saved-alumni-card";


                const imageHTML =
                    alumni.image_url
                        ? `
                            <img
                                src="${escapeAchievementHTML(
                                    alumni.image_url
                                )}"
                                alt="${escapeAchievementHTML(
                                    alumni.alumni_name
                                )}"
                                style="
                                    width:120px;
                                    height:120px;
                                    object-fit:cover;
                                    border-radius:8px;
                                "
                            >
                        `
                        : "";


                card.innerHTML = `

                    <div class="saved-alumni-header">

                        ${imageHTML}

                        <div>

                            <h2>
                                ${escapeAchievementHTML(
                                    alumni.alumni_name
                                )}
                            </h2>

                            ${
                                alumni.graduation_year
                                    ? `
                                        <p>
                                            Graduation:
                                            ${escapeAchievementHTML(
                                                alumni.graduation_year
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                            ${
                                alumni.profession
                                    ? `
                                        <p>
                                            Profession:
                                            ${escapeAchievementHTML(
                                                alumni.profession
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                        </div>

                    </div>


                    <div class="saved-alumni-story">

                        <p>
                            ${escapeAchievementHTML(
                                alumni.story
                            ).replace(
                                /\n/g,
                                "<br>"
                            )}
                        </p>

                    </div>


                    <div class="alumni-actions">

                        <button
                            type="button"
                            class="edit-btn"
                            onclick="editAlumni(${alumni.id})"
                        >
                            Edit
                        </button>


                        <button
                            type="button"
                            class="delete-btn"
                            onclick="deleteAlumni(${alumni.id})"
                        >
                            Delete
                        </button>

                    </div>

                `;


                savedAlumni.appendChild(
                    card
                );

            }
        );

    }


    // ==========================================
    // EDIT ALUMNI
    // ==========================================

    window.editAlumni =
        async function(id) {

            const {
                data,
                error
            } = await supabaseClient
                .from("alumni")
                .select("*")
                .eq(
                    "id",
                    id
                )
                .single();


            if (error) {

                console.error(
                    "Edit alumni error:",
                    error
                );

                alert(
                    "Unable to load this alumni story."
                );

                return;
            }


            if (!data) {
                return;
            }


            editingAlumniId =
                data.id;


            alumniName.value =
                data.alumni_name || "";


            graduationYear.value =
                data.graduation_year || "";


            profession.value =
                data.profession || "";


            story.value =
                data.story || "";


            existingImageUrl =
                data.image_url || null;


            alumniImage.value =
                "";


            if (data.image_url) {

                imagePreview.innerHTML = `

                    <p>Current Photo:</p>

                    <img
                        src="${escapeAchievementHTML(
                            data.image_url
                        )}"
                        alt="Current Alumni Photo"
                        style="
                            width:150px;
                            height:150px;
                            object-fit:cover;
                            border-radius:8px;
                        "
                    >

                    <p>
                        Choose a new image above
                        if you want to replace it.
                    </p>

                `;

            }
            else {

                imagePreview.innerHTML =
                    "<p>No photo uploaded.</p>";

            }


            saveButton.textContent =
                "Update Alumni Story";


            if (cancelButton) {

                cancelButton.style.display =
                    "inline-block";

            }


            message.textContent =
                "You are editing this alumni story.";


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        };


    // ==========================================
    // DELETE ALUMNI
    // ==========================================

    window.deleteAlumni =
        async function(id) {

            if (
                !confirm(
                    "Are you sure you want to delete this alumni story?"
                )
            ) {
                return;
            }


            const {
                error
            } = await supabaseClient
                .from("alumni")
                .delete()
                .eq(
                    "id",
                    id
                );


            if (error) {

                console.error(
                    "Delete alumni error:",
                    error
                );

                alert(
                    "Could not delete alumni story."
                );

                return;
            }


            if (
                editingAlumniId === id
            ) {

                editingAlumniId =
                    null;

                existingImageUrl =
                    null;

                clearAlumniForm();


                saveButton.textContent =
                    "Save Alumni Story";


                if (cancelButton) {

                    cancelButton.style.display =
                        "none";

                }

            }


            message.textContent =
                "Alumni story deleted successfully.";


            loadAlumniStories();

        };


    // ==========================================
    // INITIAL LOAD
    // ==========================================

    loadAlumniStories();

}


// ==========================================
// START ADMIN ALUMNI
// ==========================================

if (
    document.getElementById(
        "saved-alumni"
    )
) {

    setupAdminAlumni();

}


// ==========================================
// ALUMNI STORIES - PUBLIC
// ==========================================

async function setupPublicAlumni() {

    const alumniContent =
        document.getElementById("alumni-content");

    if (!alumniContent) {
        return;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("alumni")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {

        console.error(
            "Public alumni loading error:",
            error
        );

        alumniContent.innerHTML = `
            <p class="alumni-error">
                Unable to load alumni stories.
            </p>
        `;

        return;
    }

    if (
        !data ||
        data.length === 0
    ) {

        alumniContent.innerHTML = `
            <p class="no-alumni">
                No alumni stories available yet.
            </p>
        `;

        return;
    }

    alumniContent.innerHTML = "";

    data.forEach(
        alumni => {

            const card =
                document.createElement("article");

            card.className =
                "alumni-card";

            const imageHTML =
                alumni.image_url
                    ? `
                        <img
                            src="${escapeAchievementHTML(
                                alumni.image_url
                            )}"
                            alt="${escapeAchievementHTML(
                                alumni.alumni_name
                            )}"
                            class="alumni-photo"
                        >
                    `
                    : "";

            card.innerHTML = `

                ${imageHTML}

                <div class="alumni-content">

                    <h2>
                        ${escapeAchievementHTML(
                            alumni.alumni_name
                        )}
                    </h2>

                    ${
                        alumni.graduation_year
                            ? `
                                <div class="alumni-year">
                                    Class of
                                    ${escapeAchievementHTML(
                                        alumni.graduation_year
                                    )}
                                </div>
                            `
                            : ""
                    }

                    ${
                        alumni.profession
                            ? `
                                <div class="alumni-profession">
                                    ${escapeAchievementHTML(
                                        alumni.profession
                                    )}
                                </div>
                            `
                            : ""
                    }

                    <div class="alumni-story">

                        ${escapeAchievementHTML(
                            alumni.story
                        ).replace(
                            /\n/g,
                            "<br>"
                        )}

                    </div>

                </div>

            `;

            alumniContent.appendChild(card);

        }
    );
}


// Start Public Alumni

if (
    document.getElementById(
        "alumni-content"
    )
) {

    setupPublicAlumni();

}