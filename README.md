# AKNU Smart Campus ERP & AI-Powered Examination Automation System

This is the enterprise-grade monorepo for the **Adikavi Nannaya University (AKNU) Smart Campus ERP & AI-Powered Examination Automation System**. The platform is designed to scale for over 120,000 students and hundreds of affiliated colleges.

---

## 1. Directory Structure

```
.
├── backend/                  # Express.js REST API Server
├── frontend/                 # React.js SPA (Material UI + Tailwind CSS)
├── nginx.conf                # Nginx proxy config template
├── pm2.config.js             # PM2 Cluster mode configuration
└── README.md
```

For detailed folder definitions and architecture layouts, see the system designs inside the `backend` and `frontend` subdirectories.

---

## 2. Technology Stack

- **Frontend**: React.js, React Router, Redux Toolkit (RTK & RTK Query), Tailwind CSS, Material UI (MUI), React Hook Form, Axios.
- **Backend**: Node.js, Express.js, Mongoose ODM, MongoDB Community Edition.
- **Authentication**: Role-Based Access Control (RBAC) with secure JWT Access and Refresh token pairs.
- **Utilities**: Winston logging, express-validator schemas, Multer uploads, PDFKit reports, bwip-js barcodes/QRs.

---

## 3. Production Deployment Architecture

```
[Client Web Browser]
       │ (HTTPS / Port 443)
       ▼
 ┌───────────┐
 │   Nginx   │ ── Static assets served directly from /frontend/dist
 └─────┬─────┘
       │ (Proxy Pass /api to http://localhost:5000)
       ▼
 ┌───────────┐
 │    PM2    │ ── Cluster mode scaling NodeJS server across CPU cores
 └─────┬─────┘
       ▼
 ┌───────────┐
 │  NodeJS   │ ── Express application instance running on Port 5000
 └─────┬─────┘
       ▼
 ┌───────────┐
 │  MongoDB  │ ── Enterprise Database engine
 └───────────┘
```

---

## 4. Getting Started

### Development Mode

To start the backend in development:
```bash
cd backend
npm install
npm run dev
```

To start the frontend in development:
```bash
cd frontend
npm install
npm run dev
```

### Production Mode

1. **Build the client bundle**:
   ```bash
   cd frontend
   npm run build
   ```
2. **Start the server cluster via PM2**:
   ```bash
   cd ../backend
   npm install --production
   pm2 start ../pm2.config.js
   ```
3. **Configure Nginx** using the `nginx.conf` reference to serve the frontend bundle and reverse-proxy `/api` to the backend.
