# Setup & Local Developer Installation Guide

Follow these instructions to configure and execute TemplateCraft locally on your workstation.

---

## 1. Prerequisites

Ensure you have the following runtimes installed on your system:
- **Node.js**: Version `v18.x` or `v20.x` (LTS recommended)
- **NPM**: Version `v9.x` or higher
- **Docker** (Optional, for quick database environment provisioning)

---

## 2. Database Environment Setup

The backend connects to either a MySQL database (configured in `.env`) or a PostgreSQL database.

### 2.1 Using Docker Compose
A `docker-compose.yml` file is provided in the `backend/` directory to spin up a local MySQL database:
1. Open a terminal in `backend/`.
2. Run the command:
   ```bash
   docker-compose up -d
   ```
   *This starts a local MySQL container listening on `localhost:3306` with database `template_builder` and username `root`.*

### 2.2 Configuring Environment Settings
1. Locate the configuration template `.env` inside `backend/`.
2. Fill in database parameters, JWT secrets, and storage credentials:
   ```env
   PORT=3000
   NODE_ENV=development

   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=root
   DB_PASSWORD=StrongPassword123!
   DB_DATABASE=template_builder

   JWT_SECRET="fwefdsfWEFWEF1312de"
   JWT_EXPIRATION="24h"
   ```

### 2.3 Running Database Setup & Seeds
Execute the setup scripts in `backend/` to provision the database schema:
1. Install node dependencies:
   ```bash
   npm install
   ```
2. Reset and build the database tables:
   ```bash
   npm run db:setup
   ```
   *This executes all TypeORM migrations and seeds initial admin accounts and default page templates.*

---

## 3. Launching Services

### 3.1 Backend Application
1. In `backend/`, start the NestJS dev server:
   ```bash
   npm run start:dev
   ```
2. The server starts listening on `http://localhost:3000`.
3. Open `http://localhost:3000/api` in your browser to inspect the interactive Swagger API documentation.

### 3.2 Frontend Application
1. Open a new terminal in `frontend/`.
2. Install node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. The client dashboard boots up at `http://localhost:5173`.

---

## 4. Basic Testing Flow

1. **Dashboard Login**:
   - Open `http://localhost:5173/login`.
   - Log in using the seeded test administrator credentials:
     - **Email**: `admin@example.com`
     - **Password**: `admin123` (or check seeded value in setup scripts).
2. **Visual Customization**:
   - Create a test campaign (e.g. Country: `India`, Operator: `Jio`).
   - Click "Edit in canvas" on the HOME page slot.
   - Drag a block, modify colors, and click "Save".
3. **Funnel Verification**:
   - Open a new browser tab.
   - Visit the test funnel URL:
     ```
     http://localhost:5173/subscription?country=India&operator=Jio&msisdn=919876543210
     ```
   - Verify that your customized HOME page renders inside the shadow root.
4. **OTP gate testing**:
   - Open a browser tab.
   - Visit the test funnel URL *without* the `msisdn` parameter:
     ```
     http://localhost:5173/subscription?country=India&operator=Jio
     ```
   - Click "Subscribe Now" on the HOME page.
   - The runtime will transition the user to the OTP gate. Input your number, request an OTP (the mock code will appear in the developer status slot or API response), enter it, and continue to the CONFIRM page.
