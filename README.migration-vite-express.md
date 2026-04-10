# WA Template Manager (React Vite + Express)

## Struktur
- `frontend`: React + Vite + Tailwind
- `backend`: Express + Prisma + PostgreSQL

## Local Development

### 1) Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```
Backend API: `http://localhost:4000`

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend: `http://localhost:5173`

Default API URL frontend:
- `VITE_API_URL` jika di-set
- fallback otomatis: `http(s)://<hostname>:4010/api` untuk mode hosted

## Build Production

### Backend
```bash
cd backend
npm run build
npm run start
```

### Frontend
```bash
cd frontend
npm run build
```
Hasil static ada di `frontend/dist`.

## Docker Full Stack

File: `docker-compose.fullstack.yml`

```bash
cp backend/.env.docker.example backend/.env.docker
docker compose -f docker-compose.fullstack.yml up -d --build
```

Port default:
- Frontend: `3010`
- Backend: `4010`

## Fitur Yang Dimigrasikan
- Template CRUD (PostgreSQL)
- Parser variabel dinamis `{nama}`, `{kavling}`, `{nominal}`, dll.
- Input variabel otomatis sesuai template terpilih
- Generator link WA Web/Desktop
- Normalisasi nomor (`081..` -> `6281..`)
- Format nominal (`450000` -> `Rp 450.000`)
- Live preview chat
- History kirim per session browser
