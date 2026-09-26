# Bus Transport System

Hệ thống giao thông xe buýt thông minh với tracking real-time, đặt chỗ, và khai báo thân danh.

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Database**: PostgreSQL (Supabase) + Prisma ORM + PostGIS
- **Auth**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Maps**: Mapbox GL JS
- **State**: Zustand + TanStack Query
- **Testing**: Vitest + Playwright
- **Package Manager**: pnpm 10.x
- **Deployment**: Vercel + Supabase

## Project Structure

```
bus-transport-system/
├── apps/
│   └── web/                 # Next.js application
├── packages/
│   ├── db/                  # Prisma schema & database client
│   ├── ui/                  # Shared UI components
│   └── validators/          # Zod validation schemas
├── process/                 # VibeCode agent harness context
└── .github/workflows/       # CI/CD pipelines
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- Supabase account
- Mapbox account (for maps)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Start development server
pnpm dev
```

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema changes
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio

# Testing
pnpm test             # Run unit tests
pnpm test:watch       # Watch mode
pnpm test:ui          # Vitest UI
pnpm test:e2e         # Playwright E2E tests

# Code Quality
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript check
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct PostgreSQL connection |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox access token |

## Features

- 🚌 **Real-time bus tracking** - Xem vị trí xe buýt trên bản đồ
- 🪑 **Smart seat booking** - Đặt chỗ ngồi trước, giữ chỗ tự động
- 🗺️ **Route finder** - Tìm đường đi tối ưu dựa trên tuyến xe buýt
- 📱 **PWA support** - Cài đặt như app native, hoạt động offline
- 🆔 **ID declaration** - Khai báo CCCD/VNeID thay quét QR
- 🔔 **Push notifications** - Thông báo xe sắp đến, thay đổi tuyến

## Development

### Adding a new feature

1. Create a plan: `vc-generate-plan` or `ENTER FAST MODE - [feature]`
2. Implement in `apps/web/src/app/` or `packages/`
3. Write tests in `__tests__/` or `*.test.ts`
4. Run `pnpm test` and `pnpm test:e2e`
5. Submit PR

### Database changes

1. Edit `packages/db/prisma/schema.prisma`
2. Run `pnpm db:migrate` (dev) or create migration
3. Run `pnpm db:generate`
4. Update types if needed

## Deployment

### Vercel (Frontend)

1. Connect repository to Vercel
2. Add environment variables
3. Deploy

### Supabase (Backend)

1. Create Supabase project
2. Run migrations: `pnpm db:migrate`
3. Enable Realtime for tables: `buses`, `slots`, `bookings`, `bus_positions`
4. Configure Auth providers

## License

MIT
