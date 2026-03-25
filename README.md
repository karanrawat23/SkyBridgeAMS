# SkyBridgeAMS

SkyBridgeAMS is a front-end airline management system demo built with HTML, CSS, and vanilla JavaScript. It includes passenger registration, role-based login, flight discovery, booking history, and a small admin panel for managing routes.

## Highlights

- Passenger signup and login flow
- Seeded admin access for quick testing
- Flight search, filtering, and sorting
- Passenger booking and cancellation flow
- Admin panel for adding and removing flights
- Dashboard summaries for users and admins
- Browser-based data persistence using `localStorage`

## Demo Credentials

Use the seeded admin account to test the admin panel:

- Email: `admin@skybridge.com`
- Password: `admin123`

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Browser `localStorage` for demo persistence

## Project Structure

```text
SkyBridgeAMS/
|-- index.html
|-- login.html
|-- register.html
|-- dashboard.html
|-- admin.html
|-- style.css
|-- js.js
|-- data.json
|-- README.md
```

## Pages

- `index.html`: Landing page and project overview
- `register.html`: Passenger account creation
- `login.html`: Login for passengers and admin
- `dashboard.html`: Passenger dashboard for browsing and booking flights
- `admin.html`: Admin workspace for flight and booking management

## How To Run

Because this is a static front-end project, you can run it in either of these simple ways:

1. Open `index.html` directly in a browser.
2. Or serve the folder locally for a smoother experience:

```powershell
python -m http.server 3000
```

Then open `http://localhost:3000`.

## How Data Works

This project does not currently use a backend database. Demo data is stored in the browser using `localStorage`, including:

- registered users
- seeded flights
- active session
- bookings

If you want to reset the demo, clear the site's browser storage and reload the app.

## Suggested Next Improvements

- Move data handling from `localStorage` to a backend API
- Add form validation feedback per field
- Add flight dates, seat counts, and booking IDs
- Protect admin routes with stronger authentication
- Add responsive screenshots or a short demo GIF to the README

## Status

This repository is a polished academic/demo project and is a good base for future full-stack expansion.
