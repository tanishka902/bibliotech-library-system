# Bibliotech Frontend

React + Vite (JavaScript) frontend for the **Enterprise Academic Resource & Circulation Management Platform**.
It talks only to your **API Gateway (port 8080)**. It never touches PostgreSQL and does not replace any backend code.

Pages: Sign in · Sign up · Dashboard · Catalogue (search, filters, borrow/return, add/edit/delete) · My rentals · Fines · API check.

---

## 1. Run it on your Mac

### Prerequisite: Node.js 18 or newer
```bash
node -v        # should print v18 or higher
```
If the command is missing or too old:
```bash
brew install node          # needs Homebrew (https://brew.sh)
```
(or download the installer from https://nodejs.org).

### Install and start
```bash
cd path/to/bibliotech-frontend      # the folder containing package.json
cp .env.example .env
npm install
npm run dev
```
Open **http://localhost:5173**.

Stop with `Ctrl + C`. Production build: `npm run build` (output in `dist/`), preview with `npm run preview`.

### Start the backend first (suggested order)
1. PostgreSQL
2. Eureka Server (8761)
3. Auth (8081), Book (8082), Rental (8083), Fine (8084)
4. API Gateway (8080)

---

## 2. How the frontend connects to the backend

By default the browser calls `http://localhost:5173/gateway/...` and the Vite dev server forwards it to `http://localhost:8080/...`
(see `vite.config.js`). Because the browser only ever talks to one origin, **no CORS configuration is needed in this default mode.**
The proxy also removes the `Origin` header so Spring does not treat the call as cross-origin.

### Optional: call the gateway directly (needs CORS)
In `.env` set:
```
VITE_API_BASE_URL=http://localhost:8080
```
Then add a CORS filter to the **API Gateway only** (not to the other services; duplicate CORS headers make browsers reject responses):

```java
package com.example.api_gateway;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:4173"));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", c);
        return new CorsFilter(source);
    }
}
```
Restart the gateway afterwards. If the auth service also has Spring Security CORS settings or a `@CrossOrigin`, remove them when going through the gateway.

---

## 3. Gateway routes: what is confirmed and what is not

| Service | Path the frontend uses (through port 8080) | Status |
|---|---|---|
| Auth | `/auth-service/auth/signup`, `/auth-service/auth/signin` | **Confirmed by you** |
| Books | `/book-service/books...` | **Unverified** (same `/<service-id>/` pattern as auth) |
| Rentals | `/rental-service/rentals...` | **Unverified** |
| Fines | `/fine-service/fines...` | **Unverified** |

**Check them in the app:** open **API check** (sidebar, or `/diagnostics`, also reachable before login) and press **Run checks**.
It probes each service and tells you whether the route exists, is reachable but needs login, is missing (404), or the service is down (502/503).
If a different path answers, press **Use this path**; the choice is remembered in the browser. To make it permanent, set it in `.env`:
```
VITE_BOOKS_PATH=/books
VITE_RENTALS_PATH=/rentals
VITE_FINES_PATH=/fines
```

You can also test from Terminal (a 404 means no route; 401/403/200 means the route exists):
```bash
curl -i http://localhost:8080/book-service/books
curl -i http://localhost:8080/rental-service/rentals
curl -i http://localhost:8080/fine-service/fines
```

### If a route is missing, add it to the gateway
Copy your working auth route and change the id, uri and path. Roughly (property prefix and style must match whatever your auth route already uses):
```properties
spring.cloud.gateway.server.webmvc.routes[1].id=book-service
spring.cloud.gateway.server.webmvc.routes[1].uri=lb://book-service
spring.cloud.gateway.server.webmvc.routes[1].predicates[0]=Path=/book-service/**
spring.cloud.gateway.server.webmvc.routes[1].filters[0]=StripPrefix=1
```
Repeat for `rental-service` (`/rental-service/**`) and `fine-service` (`/fine-service/**`).
`StripPrefix=1` is needed because the services themselves expose `/books`, `/rentals`, `/fines` without the service-id prefix.
(503 from the gateway = route found but the service is not registered in Eureka or is not running.)

---

## 4. Endpoints used (and nothing else)

| UI feature | Request |
|---|---|
| Sign up | `POST /auth-service/auth/signup` |
| Sign in | `POST /auth-service/auth/signin` |
| Catalogue, dashboard | `GET /books` |
| Add book | `POST /books` |
| Edit book | `PUT /books/{id}` |
| Delete book | `DELETE /books/{id}` |
| **Borrow** | `POST /rentals/borrow` |
| **Return** | `PUT /rentals/{id}/return` |
| Rental history, due dates, dashboard | `GET /rentals` |
| Fines list, dashboard | `GET /fines` |
| Pay fine | `PUT /fines/{id}/pay` |
| Calculate fine | `POST /fines/calculate` |

(`/books/{id}`, `/rentals/{id}` and `/fines/{id}` exist in `src/api/services.js` but no screen needs them yet.)

All of these are prefixed with the service path from section 3. Every request except sign-in and sign-up sends `Authorization: Bearer <jwt>`.

**Deliberately not called:** `POST /books/{id}/borrow` and `POST /books/{id}/return`. They change stock directly. The Borrow and Return buttons use the Rental Service, which is expected to update the book. Calling both would change the copy count twice. See test 6 below to confirm the stock changes.

---

## 5. Things I could not verify (please check; each is a one-file fix)

Your routes were confirmed, but the JSON inside requests and responses was not visible to me. These guesses are isolated:

| Assumption | Where to change it |
|---|---|
| Sign-in body is `{username, email, password}` (the box sends what you type under both keys) | `src/contracts.js` → `signin` |
| Sign-up body is `{username, email, password}` (+ `role` if you set `VITE_SIGNUP_ROLES`) | `src/contracts.js` → `signup` |
| Sign-in response contains the JWT as `token`, `accessToken`, `access_token`, `jwt`, or is the raw token string | `src/auth/jwt.js` → `extractToken` |
| The user id comes from the sign-in response (`userId`/`id`) or JWT claims (`userId`/`uid`/`id`); otherwise the username is used | `src/auth/jwt.js` → `buildUser` |
| Borrow body is `{userId, bookId}` | `src/contracts.js` → `borrow` |
| Fine calculation body is `{rentalId, userId, bookId, daysLate, overdueDays, demandLevel}` (extras are ignored by Spring) | `src/contracts.js` → `calculateFine` |
| Book body uses `title, author, isbn, availableCopies, demandLevel` (+ `totalCopies`) | `src/contracts.js` → `book` |
| Responses use common field names (`dueDate`, `returnDate`, `amount`, `daysLate`, `paid`, …) | `src/api/normalize.js` |

If an action answers **400**, the request body does not match your DTO. If a column shows `—` or `Book #5`, a response field name is not recognised. Open the Network tab in the browser dev tools, look at the real JSON, and adjust the file in the right-hand column.

---

## 6. Features your backend does not provide (documented, not faked)

- **No "my rentals" or "my fines" endpoints.** `GET /rentals` and `GET /fines` return everyone's records. The UI narrows them to the signed-in user using the owner field in each record (`userId`/`username`). If records carry no owner, the page says so and lists everything.
- **No dashboard/summary endpoints.** Totals (books, available, active rentals, unpaid fines) are computed in the browser from the list endpoints.
- **No sign-out, refresh-token or "current user" endpoint.** Sign-out only clears the token in the browser; the JWT stays valid until it expires. Expired tokens sign you out automatically.
- **No server-side search or paging.** Search and filters run in the browser over `GET /books`.
- **Fine creation is manual here.** Nothing in the endpoint list says returning a book creates a fine, so the Fines page has **Calculate fine** for late rentals (overdue, or returned late) that have no fine yet. If your Rental Service already creates fines on return, those late rentals will simply not show up as waiting.
- **Roles are not enforced by the UI.** Add/Edit/Delete buttons appear for `ADMIN`/`LIBRARIAN` (configurable with `VITE_MANAGE_ROLES`), or for everyone when the JWT has no role claim. Real enforcement is the backend's job; a 403 is shown as an error message.
- **Payment is a status change only** (`PUT /fines/{id}/pay`); there is no payment gateway.

---

## 7. How to test every feature

Start the backend, run `npm run dev`, then:

1. **API check** – open `/diagnostics`, press *Run checks*. Auth should show "Route reachable" (400/401/403 for the empty probe is fine). For Books/Rentals/Fines, make sure the path in use shows green or "login required". Fix any 404 (section 3).
2. **Sign up** – `/signup`: submit with a short password to see validation; then register a real user. You are sent to Sign in.
3. **Sign in** – wrong password shows an error; the right one lands on the Dashboard. If you see "no JWT I could find", fix `extractToken` (section 5).
4. **JWT sent** – DevTools → Network → click any `/books` request → Request Headers contains `Authorization: Bearer eyJ…`.
5. **Catalogue** – books load as covers with author, ISBN, copies and demand level. Try the search box (title, author, ISBN), the availability filter and the demand filter.
6. **Borrow** – press *Borrow* on a book with copies. Expect a success toast, the copy count to drop by exactly **1**, and the button to turn into *Return*. If the count does not change, the Rental Service is not updating the Book Service. If it drops by 2, tell me and I will adjust.
7. **My rentals** – the loan appears under *On loan* with a due date and a "Nd left" badge. *Returned* tab starts empty.
8. **Return** – press *Return* (catalogue or My rentals). The rental moves to *Returned* and the copy count goes back up by 1.
9. **Overdue + fine** – to force a late rental, set a rental's `due_date` in the past in PostgreSQL (or borrow with a short loan period if your backend has one). It shows a red "Nd overdue" badge. On **Fines** press *Calculate fine*, choose it, confirm. The fine appears with days late, demand level and amount.
10. **Pay** – press *Pay fine*; the badge turns green "Paid", Outstanding goes down.
11. **Dashboard** – Total books, Available, Active rentals and Unpaid fines match what you just did.
12. **Book management** – (as ADMIN/LIBRARIAN or when your token has no role) *Add book* with empty fields to see validation, then add one, edit it, delete it.
13. **Session** – refresh the page (stays signed in), press the logout icon (back to Sign in), close the tab and reopen (signed out; the token lives in `sessionStorage`).
14. **Errors** – stop the Book Service and open the Catalogue: you get a clear message with a link to the API check instead of a blank page.
15. **Mobile** – narrow the browser window below 860px: the sidebar becomes a menu button and tables scroll sideways.

---

## 8. Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Cannot reach the API Gateway" | Gateway not running on 8080; or you set `VITE_API_BASE_URL=http://localhost:8080` without the CORS filter |
| 404 on books/rentals/fines | Gateway route missing or different prefix: use the API check page |
| 502 / 503 | Service down, or not registered in Eureka (http://localhost:8761) |
| 401 right after signing in | The service validating the token disagrees with the Auth Service on the secret/format |
| 403 on sign-in/sign-up | Spring Security blocking POST (CSRF) or the path not permitted in the Auth Service's security config |
| 400 on borrow / fine / add book | Request body does not match your DTO: edit `src/contracts.js` |
| Port 5173 busy | Vite picks the next free port and prints it; use that URL |
| `npm install` errors | Check `node -v` is 18+; delete `node_modules` and retry |

---

## 9. Token storage

The JWT is stored in `sessionStorage` only: it survives a refresh, disappears when the tab closes, and is never put in `localStorage` or a cookie or in the URL.
The app checks the token's `exp` claim and signs out on expiry or on any 401 for a protected call.
For production, prefer short-lived tokens and an HttpOnly-cookie flow, which needs backend changes.

---

## 10. Project layout

```
bibliotech-frontend/
├─ index.html · vite.config.js · package.json · .env.example
└─ src/
   ├─ config.js        gateway paths, roles, env settings
   ├─ contracts.js     request bodies sent to the backend (edit here if you get 400s)
   ├─ api/             client.js (fetch + Bearer + errors) · services.js (one fn per endpoint) · normalize.js
   ├─ auth/            AuthContext · jwt.js · session.js
   ├─ components/      Shell (sidebar) · Modal · Toast · Badge · StatCard · ErrorBanner · …
   ├─ pages/           Login · Signup · Dashboard · Books · Rentals · Fines · Diagnostics
   ├─ lib/             dates · scope (per-user filtering) · format
   └─ styles.css
```
