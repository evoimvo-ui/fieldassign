# FieldAssign — Task · Proof · Report

SaaS PWA za field operations management.

## Stack
- **Client**: React + Vite + Tailwind CSS (PWA)
- **Server**: Node.js + Express + MongoDB (Mongoose)
- **Auth**: JWT (vlastita implementacija, zamjenljiva sa Clerk)
- **Plaćanje**: Paddle webhooks

## Pokretanje

### 1. Server
```bash
cd server
cp .env.example .env
# popuni .env varijable
npm install
npm run dev
```

### 2. Client
```bash
cd client
npm install
npm run dev
```

## Struktura
```
fieldassign/
├── client/          # React PWA
│   └── src/
│       ├── pages/       # Dashboard, Tasks, Activities, Reports, Admin
│       ├── components/  # TaskCard, ActivityList, Modal...
│       ├── hooks/       # useTasks, useAuth, useActivities
│       ├── store/       # Zustand store
│       └── services/    # API calls
└── server/
    ├── models/      # User, Organization, Task, Activity
    ├── routes/      # /api/tasks, /api/users, /api/webhooks
    ├── middleware/  # auth, subscriptionCheck
    └── services/   # reportGenerator
```
