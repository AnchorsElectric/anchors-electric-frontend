# Anchors Electric - Frontend

Frontend application for Anchors Electric employee management system.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: SASS/SCSS
- **Form Handling**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Containerization**: Docker

## Features

- Employee registration and profile management
- Admin portal for application review
- Document upload to AWS S3
- Emergency contact management
- Responsive design

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose (for containerized setup)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Tech3790/anchors-electric-frontend.git
cd anchors-electric-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional):
The app defaults to the production backend. For local development, create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker Setup

### Development with Docker

```bash
# Build and start container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop container
docker-compose down
```

### Production Build

```bash
# Build Docker image
docker-compose build

# Run in production mode
docker-compose up -d
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (employee)/        # Employee portal pages
│   ├── (admin)/           # Admin portal pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # UI components
│   └── forms/            # Form components
├── lib/                   # Utilities
│   ├── api/              # API client
│   ├── types/            # TypeScript types
│   └── utils/            # Helper functions
└── public/                # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run docker:build` - Build Docker image
- `npm run docker:up` - Start Docker container
- `npm run docker:down` - Stop Docker container
- `npm run docker:logs` - View container logs

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: https://anchors-electric-backend-production.up.railway.app)
- `FRONTEND_PORT` - Frontend port for Docker (default: 3000)

## License

Private - Anchors Electric
