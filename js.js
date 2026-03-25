const STORAGE_KEYS = {
    users: "skybridge_users",
    flights: "skybridge_flights",
    session: "skybridge_session",
    bookings: "skybridge_bookings"
};

const DEFAULT_ADMIN = {
    name: "SkyBridge Admin",
    email: "admin@skybridge.com",
    password: "admin123",
    role: "admin",
    createdAt: "2026-03-22T00:00:00.000Z"
};

const DEFAULT_FLIGHTS = [
    {
        id: "SB101",
        name: "SkyBridge 101",
        from: "Delhi",
        to: "Mumbai",
        departure: "08:10 AM",
        price: 4500
    },
    {
        id: "SB202",
        name: "SkyBridge 202",
        from: "Dehradun",
        to: "Bengaluru",
        departure: "01:45 PM",
        price: 6200
    },
    {
        id: "SB303",
        name: "SkyBridge 303",
        from: "Delhi",
        to: "Goa",
        departure: "06:25 PM",
        price: 5200
    }
];

const filterState = {
    search: "",
    from: "all",
    to: "all",
    sort: "default"
};

document.addEventListener("DOMContentLoaded", () => {
    initializeStorage();
    wireGlobalActions();

    const page = document.body.dataset.page;

    if (page === "home") {
        renderHomePage();
    }

    if (page === "register") {
        setupRegisterPage();
    }

    if (page === "login") {
        setupLoginPage();
    }

    if (page === "dashboard") {
        setupDashboardPage();
    }

    if (page === "admin") {
        setupAdminPage();
    }
});

function initializeStorage() {
    const storedUsers = readStorage(STORAGE_KEYS.users, []);
    const users = Array.isArray(storedUsers) ? storedUsers : [];
    const hasAdmin = users.some((user) => normalizeEmail(user.email) === DEFAULT_ADMIN.email);

    if (!hasAdmin) {
        users.unshift(DEFAULT_ADMIN);
        writeStorage(STORAGE_KEYS.users, users);
    }

    const storedFlights = readStorage(STORAGE_KEYS.flights, []);
    const flights = Array.isArray(storedFlights) ? storedFlights : [];
    if (!flights.length) {
        writeStorage(STORAGE_KEYS.flights, DEFAULT_FLIGHTS);
    }

    const bookings = readStorage(STORAGE_KEYS.bookings, []);
    if (!Array.isArray(bookings)) {
        writeStorage(STORAGE_KEYS.bookings, []);
    }
}

function wireGlobalActions() {
    document.querySelectorAll('[data-action="logout"]').forEach((button) => {
        button.addEventListener("click", () => {
            localStorage.removeItem(STORAGE_KEYS.session);
            window.location.href = "login.html";
        });
    });
}

function setupRegisterPage() {
    const form = document.getElementById("registerForm");

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = normalizeEmail(document.getElementById("email").value);
        const password = document.getElementById("password").value.trim();

        if (name.length < 2) {
            setMessage("formMessage", "Please enter a valid full name.", "error");
            return;
        }

        if (!isValidEmail(email)) {
            setMessage("formMessage", "Please enter a valid email address.", "error");
            return;
        }

        if (password.length < 6) {
            setMessage("formMessage", "Password should be at least 6 characters long.", "error");
            return;
        }

        const users = getUsers();
        const exists = users.some((user) => normalizeEmail(user.email) === email);

        if (exists) {
            setMessage("formMessage", "This email is already registered. Please log in instead.", "error");
            return;
        }

        users.push({
            name,
            email,
            password,
            role: "user",
            createdAt: new Date().toISOString()
        });

        writeStorage(STORAGE_KEYS.users, users);
        form.reset();
        setMessage("formMessage", "Registration successful. Redirecting to login...", "success");

        window.setTimeout(() => {
            window.location.href = "login.html";
        }, 900);
    });
}

function setupLoginPage() {
    const session = getSession();
    if (session) {
        redirectByRole(session.role);
        return;
    }

    const form = document.getElementById("loginForm");

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const email = normalizeEmail(document.getElementById("loginEmail").value);
        const password = document.getElementById("loginPassword").value.trim();
        const user = getUsers().find((entry) => normalizeEmail(entry.email) === email);

        if (!user || user.password !== password) {
            setMessage("loginMessage", "Invalid email or password. Please try again.", "error");
            return;
        }

        writeStorage(STORAGE_KEYS.session, {
            email: user.email,
            name: user.name,
            role: user.role
        });

        setMessage("loginMessage", "Login successful. Opening your workspace...", "success");

        window.setTimeout(() => {
            redirectByRole(user.role);
        }, 600);
    });
}

function setupDashboardPage() {
    const session = requireSession("user");
    if (!session) {
        return;
    }

    document.getElementById("dashboardTitle").textContent = `Welcome, ${session.name}`;

    const filterForm = document.getElementById("flightFilterForm");
    filterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        syncFilterState();
        renderDashboard(session.email);
    });

    filterForm.addEventListener("reset", () => {
        window.setTimeout(() => {
            filterState.search = "";
            filterState.from = "all";
            filterState.to = "all";
            filterState.sort = "default";
            renderDashboard(session.email);
            setMessage("dashboardMessage", "Filters cleared. Showing all flights.", "info");
        }, 0);
    });

    document.getElementById("flights").addEventListener("click", (event) => {
        const button = event.target.closest("[data-book-flight]");
        if (!button) {
            return;
        }

        bookFlight(button.dataset.bookFlight, session.email);
    });

    document.getElementById("bookings").addEventListener("click", (event) => {
        const button = event.target.closest("[data-cancel-booking]");
        if (!button) {
            return;
        }

        cancelBooking(button.dataset.cancelBooking, session.email);
    });

    populateRouteFilters();
    renderDashboard(session.email);
}

function setupAdminPage() {
    const session = requireSession("admin");
    if (!session) {
        return;
    }

    document.getElementById("adminTitle").textContent = `Welcome, ${session.name}`;

    const form = document.getElementById("adminFlightForm");
    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const name = document.getElementById("flightName").value.trim();
        const from = capitalizeWords(document.getElementById("from").value.trim());
        const to = capitalizeWords(document.getElementById("to").value.trim());
        const departure = document.getElementById("flightDeparture").value.trim();
        const price = Number(document.getElementById("price").value);

        if (!name || !from || !to || !departure || !price) {
            setMessage("adminMessage", "Please fill all flight details before saving.", "error");
            return;
        }

        if (from.toLowerCase() === to.toLowerCase()) {
            setMessage("adminMessage", "Source and destination cannot be the same.", "error");
            return;
        }

        const flights = getFlights();
        flights.unshift({
            id: createFlightId(name),
            name,
            from,
            to,
            departure,
            price
        });

        writeStorage(STORAGE_KEYS.flights, flights);
        form.reset();
        setMessage("adminMessage", "New flight added successfully.", "success");
        renderAdminPanel();
    });

    document.getElementById("adminFlights").addEventListener("click", (event) => {
        const button = event.target.closest("[data-delete-flight]");
        if (!button) {
            return;
        }

        deleteFlight(button.dataset.deleteFlight);
    });

    renderAdminPanel();
}

function renderHomePage() {
    const session = getSession();
    const flights = getFlights();
    const users = getUsers().filter((user) => user.role !== "admin");
    const bookings = getBookings();

    document.getElementById("homeFlightCount").textContent = String(flights.length);
    document.getElementById("homeUserCount").textContent = String(users.length);
    document.getElementById("homeBookingCount").textContent = String(bookings.length);

    const sessionStatus = document.getElementById("sessionStatus");
    if (!session) {
        sessionStatus.textContent = "No active session. Register or log in to continue.";
        return;
    }

    const nextPage = session.role === "admin" ? "Admin Panel" : "Dashboard";
    sessionStatus.textContent = `Signed in as ${session.name}. Open ${nextPage} from the menu.`;
}

function renderDashboard(userEmail) {
    syncFilterState();
    populateRouteFilters();

    const filteredFlights = getFilteredFlights();
    const allBookings = getBookings();
    const userBookings = allBookings.filter((booking) => booking.userEmail === userEmail);
    const flightsById = Object.fromEntries(getFlights().map((flight) => [flight.id, flight]));
    const totalSpend = userBookings.reduce((sum, booking) => {
        const flight = flightsById[booking.flightId];
        return sum + (flight ? Number(flight.price) : 0);
    }, 0);

    document.getElementById("availableFlightCount").textContent = String(filteredFlights.length);
    document.getElementById("userBookingCount").textContent = String(userBookings.length);
    document.getElementById("userSpendTotal").textContent = formatCurrency(totalSpend);

    renderFlightCards(filteredFlights);
    renderBookingCards(userBookings, flightsById);
}

function renderAdminPanel() {
    const flights = getFlights();
    const users = getUsers().filter((user) => user.role !== "admin");
    const bookings = getBookings();

    document.getElementById("adminFlightCount").textContent = String(flights.length);
    document.getElementById("adminUserCount").textContent = String(users.length);
    document.getElementById("adminBookingCount").textContent = String(bookings.length);

    const adminFlights = document.getElementById("adminFlights");
    if (!flights.length) {
        adminFlights.innerHTML = createEmptyState("No flights added yet.", "Create the first route using the form above.");
    } else {
        adminFlights.innerHTML = flights
            .map((flight) => `
                <article class="flight-card">
                    <div class="tag">${escapeHtml(flight.id)}</div>
                    <h3>${escapeHtml(flight.name)}</h3>
                    <div class="flight-meta">
                        <span class="route-line">${escapeHtml(flight.from)} &rarr; ${escapeHtml(flight.to)}</span>
                        <span>Departure: ${escapeHtml(flight.departure)}</span>
                        <span class="price-line">${formatCurrency(flight.price)}</span>
                    </div>
                    <div class="card-actions">
                        <button type="button" class="button danger" data-delete-flight="${escapeHtml(flight.id)}">Delete Flight</button>
                    </div>
                </article>
            `)
            .join("");
    }

    renderAdminBookings(bookings, flights, users);
}

function renderFlightCards(flights) {
    const container = document.getElementById("flights");

    if (!flights.length) {
        container.innerHTML = createEmptyState("No matching flights found.", "Try changing your filters or add new routes from the admin panel.");
        return;
    }

    container.innerHTML = flights
        .map((flight) => `
            <article class="flight-card">
                <div class="tag">${escapeHtml(flight.id)}</div>
                <h3>${escapeHtml(flight.name)}</h3>
                <div class="flight-meta">
                    <span class="route-line">${escapeHtml(flight.from)} &rarr; ${escapeHtml(flight.to)}</span>
                    <span>Departure: ${escapeHtml(flight.departure)}</span>
                    <span class="price-line">${formatCurrency(flight.price)}</span>
                </div>
                <div class="card-actions">
                    <button type="button" class="button primary" data-book-flight="${escapeHtml(flight.id)}">Book Flight</button>
                </div>
            </article>
        `)
        .join("");
}

function renderBookingCards(bookings, flightsById) {
    const container = document.getElementById("bookings");

    if (!bookings.length) {
        container.innerHTML = createEmptyState("No bookings yet.", "Book a flight to see it appear here.");
        return;
    }

    container.innerHTML = bookings
        .map((booking) => {
            const flight = flightsById[booking.flightId];

            if (!flight) {
                return "";
            }

            return `
                <article class="booking-card">
                    <h3>${escapeHtml(flight.name)}</h3>
                    <div class="booking-meta">
                        <span class="route-line">${escapeHtml(flight.from)} &rarr; ${escapeHtml(flight.to)}</span>
                        <span>Departure: ${escapeHtml(flight.departure)}</span>
                        <span>Booked On: ${formatDate(booking.bookedAt)}</span>
                        <span class="price-line">${formatCurrency(flight.price)}</span>
                    </div>
                    <div class="card-actions">
                        <button type="button" class="button danger" data-cancel-booking="${escapeHtml(booking.id)}">Cancel Booking</button>
                    </div>
                </article>
            `;
        })
        .join("");
}

function renderAdminBookings(bookings, flights, users) {
    const container = document.getElementById("adminBookings");

    if (!bookings.length) {
        container.innerHTML = createEmptyState("No bookings available.", "Passenger activity will show up here after bookings are created.");
        return;
    }

    const flightsById = Object.fromEntries(flights.map((flight) => [flight.id, flight]));
    const usersByEmail = Object.fromEntries(users.map((user) => [normalizeEmail(user.email), user]));

    container.innerHTML = bookings
        .slice()
        .sort((left, right) => new Date(right.bookedAt) - new Date(left.bookedAt))
        .map((booking) => {
            const flight = flightsById[booking.flightId];
            const passenger = usersByEmail[normalizeEmail(booking.userEmail)];

            if (!flight) {
                return "";
            }

            return `
                <article class="booking-card">
                    <h3>${escapeHtml(flight.name)}</h3>
                    <div class="booking-meta">
                        <span class="route-line">${escapeHtml(flight.from)} &rarr; ${escapeHtml(flight.to)}</span>
                        <span>Passenger: ${escapeHtml(passenger ? passenger.name : booking.userEmail)}</span>
                        <span>Email: ${escapeHtml(booking.userEmail)}</span>
                        <span>Booked On: ${formatDate(booking.bookedAt)}</span>
                        <span class="price-line">${formatCurrency(flight.price)}</span>
                    </div>
                </article>
            `;
        })
        .join("");
}

function populateRouteFilters() {
    const page = document.body.dataset.page;
    if (page !== "dashboard") {
        return;
    }

    const flights = getFlights();
    const fromFilter = document.getElementById("fromFilter");
    const toFilter = document.getElementById("toFilter");
    const searchInput = document.getElementById("searchInput");
    const sortFilter = document.getElementById("sortFilter");

    const fromCities = [...new Set(flights.map((flight) => flight.from))].sort();
    const toCities = [...new Set(flights.map((flight) => flight.to))].sort();

    fillSelect(fromFilter, fromCities, "All cities", filterState.from);
    fillSelect(toFilter, toCities, "All destinations", filterState.to);
    searchInput.value = filterState.search;
    sortFilter.value = filterState.sort;
}

function fillSelect(select, values, defaultLabel, selectedValue) {
    const options = [`<option value="all">${defaultLabel}</option>`]
        .concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`))
        .join("");

    select.innerHTML = options;
    select.value = values.includes(selectedValue) ? selectedValue : "all";
}

function syncFilterState() {
    const page = document.body.dataset.page;
    if (page !== "dashboard") {
        return;
    }

    filterState.search = document.getElementById("searchInput").value.trim().toLowerCase();
    filterState.from = document.getElementById("fromFilter").value;
    filterState.to = document.getElementById("toFilter").value;
    filterState.sort = document.getElementById("sortFilter").value;
}

function getFilteredFlights() {
    const flights = getFlights().filter((flight) => {
        const searchPool = `${flight.name} ${flight.from} ${flight.to}`.toLowerCase();
        const matchesSearch = !filterState.search || searchPool.includes(filterState.search);
        const matchesFrom = filterState.from === "all" || flight.from === filterState.from;
        const matchesTo = filterState.to === "all" || flight.to === filterState.to;

        return matchesSearch && matchesFrom && matchesTo;
    });

    if (filterState.sort === "price-asc") {
        flights.sort((left, right) => left.price - right.price);
    }

    if (filterState.sort === "price-desc") {
        flights.sort((left, right) => right.price - left.price);
    }

    if (filterState.sort === "name-asc") {
        flights.sort((left, right) => left.name.localeCompare(right.name));
    }

    return flights;
}

function bookFlight(flightId, userEmail) {
    const selectedFlight = getFlights().find((flight) => flight.id === flightId);
    if (!selectedFlight) {
        setMessage("dashboardMessage", "This flight is no longer available.", "error");
        renderDashboard(userEmail);
        return;
    }

    const bookings = getBookings();
    const exists = bookings.some((booking) => booking.flightId === flightId && booking.userEmail === userEmail);

    if (exists) {
        setMessage("dashboardMessage", "You have already booked this flight.", "error");
        return;
    }

    bookings.unshift({
        id: `BK-${Date.now()}`,
        flightId,
        userEmail,
        bookedAt: new Date().toISOString()
    });

    writeStorage(STORAGE_KEYS.bookings, bookings);
    setMessage("dashboardMessage", "Flight booked successfully.", "success");
    renderDashboard(userEmail);
}

function cancelBooking(bookingId, userEmail) {
    const bookings = getBookings().filter((booking) => booking.id !== bookingId);
    writeStorage(STORAGE_KEYS.bookings, bookings);
    setMessage("dashboardMessage", "Booking cancelled successfully.", "info");
    renderDashboard(userEmail);
}

function deleteFlight(flightId) {
    const remainingFlights = getFlights().filter((flight) => flight.id !== flightId);
    const remainingBookings = getBookings().filter((booking) => booking.flightId !== flightId);

    writeStorage(STORAGE_KEYS.flights, remainingFlights);
    writeStorage(STORAGE_KEYS.bookings, remainingBookings);
    setMessage("adminMessage", "Flight deleted. Related bookings were also removed.", "info");
    renderAdminPanel();
}

function requireSession(role) {
    const session = getSession();

    if (!session) {
        window.location.href = "login.html";
        return null;
    }

    if (role && session.role !== role) {
        redirectByRole(session.role);
        return null;
    }

    return session;
}

function redirectByRole(role) {
    window.location.href = role === "admin" ? "admin.html" : "dashboard.html";
}

function getUsers() {
    return readStorage(STORAGE_KEYS.users, []);
}

function getFlights() {
    return readStorage(STORAGE_KEYS.flights, []);
}

function getBookings() {
    return readStorage(STORAGE_KEYS.bookings, []);
}

function getSession() {
    return readStorage(STORAGE_KEYS.session, null);
}

function readStorage(key, fallback) {
    try {
        const rawValue = localStorage.getItem(key);
        return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
        return fallback;
    }
}

function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function setMessage(elementId, text, type) {
    const message = document.getElementById(elementId);
    if (!message) {
        return;
    }

    message.hidden = false;
    message.textContent = text;
    message.className = `message is-${type}`;
}

function formatCurrency(value) {
    return `Rs ${Number(value).toLocaleString("en-IN")}`;
}

function formatDate(value) {
    return new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function normalizeEmail(value) {
    return value.trim().toLowerCase();
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function capitalizeWords(value) {
    return value
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

function createFlightId(name) {
    const base = name
        .replace(/[^a-z0-9]/gi, "")
        .toUpperCase()
        .slice(0, 5) || "FLY";

    return `${base}${String(Date.now()).slice(-3)}`;
}

function createEmptyState(title, description) {
    return `
        <article class="empty-state">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(description)}</p>
        </article>
    `;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
