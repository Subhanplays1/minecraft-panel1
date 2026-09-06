# Minecraft Server Hosting Panel

A full-featured white-label Minecraft server hosting panel with real server creation, process management, and a modern admin dashboard.

## Tech Stack

- **Backend:** Node.js, Express, Prisma ORM, SQLite
- **Frontend:** Next.js 14, React, Tailwind CSS
- **Server Management:** Custom process manager, Jar downloader (Paper, Purpur, Velocity, Fabric, Forge, Waterfall)

## Quick Start

### Prerequisites

- **Node.js 20+** (required - older versions will fail with syntax errors)
- Java 21+ for Minecraft servers
- npm
- Linux recommended for production (Playit tunnel requires Linux)

### Installation

```bash
# Clone the repo
git clone https://github.com/Subhanplays1/minecraft-panel1.git
cd minecraft-panel

# If using nvm, use the right Node version
nvm use

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Setup

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your values:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
PORT=3001
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

### Run

```bash
# Terminal 1 - Backend (port 3001)
cd backend
npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Default Login

- **Email:** `admin@example.com`
- **Password:** `admin123`

## Features

- **Server Management** - Create, start, stop, restart Minecraft servers
- **Real-time Console** - Live server log streaming
- **Jar Downloader** - Auto-downloads Paper, Purpur, Velocity, Fabric, Forge, Waterfall
- **Node Management** - Multi-node server allocation
- **Backup System** - Server backups with restore
- **File Manager** - Browse and edit server files
- **User Management** - Admin user control
- **White-label Branding** - Custom logo, colors, favicon, fonts
- **Responsive Dashboard** - Server stats, recent activity, analytics

## Supported Server Types

| Type | Source |
|------|--------|
| Paper | Fill v3 API |
| Purpur | PurpurMC API |
| Velocity | Fill v3 API |
| Waterfall | Fill v3 API |
| Fabric | FabricMeta API |
| Forge | Minecraft Forge Maven |

## Project Structure

```
minecraft-panel/
├── backend/
│   ├── prisma/          # Database schema
│   ├── src/
│   │   ├── index.ts     # Server entry
│   │   ├── routes/      # API routes
│   │   ├── services/    # Process manager, jar downloader
│   │   ├── middleware/   # Auth, validation
│   │   └── utils/       # Prisma client
│   └── servers/         # Server instances (gitignored)
├── frontend/
│   └── src/
│       └── app/
│           ├── (dashboard)/  # Dashboard pages
│           ├── auth/         # Login/register
│           └── components/   # Shared components
└── shared/              # Shared types
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/servers` | List servers |
| POST | `/api/servers` | Create server |
| POST | `/api/servers/:id/start` | Start server |
| POST | `/api/servers/:id/stop` | Stop server |
| POST | `/api/servers/:id/restart` | Restart server |
| GET | `/api/servers/:id/console` | Get console logs |
| POST | `/api/servers/:id/command` | Send command |
| GET | `/api/nodes` | List nodes |
| POST | `/api/nodes` | Create node |
| GET | `/api/backups` | List backups |
| POST | `/api/backups` | Create backup |
| GET | `/api/versions/:software` | List versions |
| GET | `/api/admin/stats` | Admin statistics |
