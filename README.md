# SecureVault — Zero-Knowledge Password Manager

SecureVault is a full-stack, zero-knowledge password manager built with **React**, **TypeScript**, **Node.js (Fastify)**, and the **Web Crypto API**.

Every credential, username, and internal index record is encrypted and authenticated entirely in the user's browser before being persisted to the backend. The server acts strictly as an authenticated, blind storage layer—it never receives the user's Master Password, derived encryption keys, or plaintext credentials.

---

## Core Security & Cryptographic Architecture

SecureVault enforces a strict boundary between **Account Authentication** (proving identity to the server) and **Vault Encryption** (protecting stored secrets):

### 1. Client-Side Vault Cryptography (`Web Crypto API`)
* **Key Derivation (`PBKDF2-SHA256`):** Derives a non-extractable master key from the user's **Master Password** and a random 128-bit salt using $100,000$ iterations.
* **Sub-Key Separation (`HMAC-SHA256`):** Uses the master key as a PRF to derive two isolated, non-extractable sub-keys:
  * An **HMAC key** for deterministic, privacy-preserving domain/slot lookups.
  * An **AES-GCM key** for authenticated encryption.
* **Authenticated Encryption (`AES-256-GCM`):** Seals every record with a fresh 96-bit random IV and binds the ciphertext to its HMAC lookup key via **Associated Authenticated Data (AAD)**, preventing record-swapping attacks.
* **Length-Hiding Padding:** Pads every plaintext value to a fixed $194$-byte buffer before encryption so ciphertext sizes leak nothing about password lengths.
* **Encrypted Canary & Rollback Detection:** Verifies the Master Password on unlock using an encrypted canary (`keychain-check-v1`) and validates the serialized vault against a `SHA-256` integrity checksum.

### 2. Server-Side Authentication & Sync (`Fastify` + `Prisma`)
* **Account Password Hashing (`Argon2id`):** User login passwords (kept separate from the Vault Master Password) are hashed on the backend using `Argon2id` ($64\text{ MiB}$ memory cost, $3$ iterations).
* **Hardened Session Management:** Issues signed, `HttpOnly`, `SameSite=Strict` session cookies (`sv_session`) to protect against XSS token theft.
* **Brute-Force & Rate-Limit Protection:** Enforces per-IP rate limiting alongside per-account failed-login counters and temporary account lockouts.
* **Optimistic Concurrency Control:** Tracks a monotonic `version` integer per vault (`409 Conflict` on mismatch) so stale browser tabs cannot silently overwrite newer vault updates.
* **Security Audit Logging:** Records non-sensitive security events (`REGISTER`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `VAULT_CREATED`, `VAULT_UPDATED`, `VAULT_DELETED`).

---

## Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Lucide Icons, Web Crypto API
* **Backend:** Node.js, TypeScript, Fastify (`@fastify/jwt`, `@fastify/cookie`, `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`), Argon2, Zod
* **Database & ORM:** Prisma ORM with SQLite (development) / PostgreSQL (production-ready)

---

## Project Structure

```text
├── cryptography/                  # Core Web Crypto Keychain implementation
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI inputs, strength meters, logo
│   │   ├── context/
│   │   │   └── VaultContext.tsx   # Manages session state & in-memory Keychain ref
│   │   ├── crypto/                # Synced browser Keychain module
│   │   ├── layouts/
│   │   │   └── AppLayout.tsx      # Workspace sidebar, lock & sign-out controls
│   │   ├── lib/
│   │   │   ├── apiClient.ts       # Credentialed fetch wrapper for /api/*
│   │   │   ├── vaultService.ts    # Encrypted vault index & backend sync adapter
│   │   │   └── strength.ts        # Local password strength evaluation
│   │   └── pages/                 # Welcome, AuthPage, Setup, Unlock, Dashboard, Vault, Generator, Security
└── backend/
    ├── prisma/
    │   └── schema.prisma          # User, Vault, and AuditLog data models
    └── src/
        ├── config/env.ts          # Zod-validated environment configuration
        ├── plugins/               # Prisma lifecycle, Helmet/CORS/RateLimit, JWT Cookie Auth
        ├── modules/
        │   ├── auth/              # Registration, Argon2id login, logout, session check
        │   ├── vault/             # Encrypted vault CRUD & version conflict checks
        │   └── audit/             # Security event logging
        ├── app.ts                 # Fastify application builder
        └── server.ts              # Entrypoint & graceful shutdown
```

---

## Getting Started

### Prerequisites
* **Node.js** `v20+`
* **npm** `v10+`

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Generate two distinct 64-character hex secrets for `JWT_SECRET` and `COOKIE_SECRET` in `backend/.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run the initial database migration and start the development server:

```bash
npx prisma migrate dev --name init
npm run dev
```

The API server will start on `http://localhost:4000` (health check available at `GET /api/health`).

### 2. Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | No | Registers a new account (`Argon2id`) and sets the `sv_session` cookie. |
| `POST` | `/api/auth/login` | No | Verifies credentials, enforces lockout policy, and issues session cookie. |
| `POST` | `/api/auth/logout` | No | Clears the active session cookie. |
| `GET` | `/api/auth/me` | Yes | Returns current authenticated user info and `hasVault` status. |

### Encrypted Vault (`/api/vault`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/vault` | Yes | Retrieves the user's encrypted `{ repr, checksum, version }`. |
| `POST` | `/api/vault` | Yes | Stores a newly initialized encrypted vault (`version: 1`). |
| `PUT` | `/api/vault` | Yes | Atomically updates the vault blob if `expectedVersion` matches. |
| `DELETE` | `/api/vault` | Yes | Deletes the user's vault record so a new one can be created. |

---

## Security Notes for Production Deployment

* Set `NODE_ENV=production` so session cookies enforce the `Secure` flag over HTTPS.
* Switch `provider = "postgresql"` in `backend/prisma/schema.prisma` and point `DATABASE_URL` to a managed PostgreSQL instance.
* Configure `FRONTEND_ORIGIN` in `backend/.env` to match your exact deployed frontend domain.