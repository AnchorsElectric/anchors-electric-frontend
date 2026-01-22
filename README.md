# Anchors Electric Frontend

Employee management system frontend application.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** SASS/SCSS
- **HTTP Client:** Axios
- **Deployment:** Vercel

## Quick Start

### Prerequisites

- Node.js 18+

### Installation

1. Clone and install:
```bash
git clone https://github.com/Tech3790/anchors-electric-frontend.git
cd anchors-electric-frontend
npm install
```

2. Set up environment variables:
```bash
# Create .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── employee/          # Employee portal
│   ├── admin/             # Admin portal
│   └── layout.tsx         # Root layout
├── components/            # React components
├── lib/                   # Utilities
│   ├── api/              # API client
│   ├── types/            # TypeScript types
│   └── utils/            # Helper functions
└── public/                # Static assets
```

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL
  - Production: `https://anchors-electric-backend-production.up.railway.app`
  - Local: `http://localhost:3001`

## Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) - Vercel deployment instructions

## Production

- **Frontend URL:** `https://employees.anchorselectric.com`
- **Backend URL:** `https://anchors-electric-backend-production.up.railway.app`

## License

Private - Anchors Electric
