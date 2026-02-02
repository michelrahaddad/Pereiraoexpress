# Pereirão Express - Home Services Platform

## Overview

Pereirão Express is a home services marketplace application that connects clients with qualified service providers (electricians, plumbers, painters, etc.). The platform features AI-powered diagnostics using Google's Gemini to help users describe their problems and receive instant assessments. The app supports three user roles: clients who request services, providers who fulfill them, and admins who manage the platform.

## User Preferences

Preferred communication style: Simple, everyday language.

### Design Preferences
- **Theme**: Futuristic design with glassmorphism effects, rounded elements, and gradient backgrounds
- **Colors**: Electric blue (primary) + yellow (accent) color scheme
- **Border Radius**: Large rounded corners (1rem-3rem) for buttons and cards
- **Typography**: Clean, modern fonts with strong hierarchy
- **Effects**: Backdrop blur, gradient overlays, subtle shadows

### Copywriting Style
- Direct and simple language ("Simples assim")
- Focus on trust, speed, and transparency
- Benefit-oriented headlines
- Clear call-to-actions
- Tagline: "Chamou. Resolveu. Simples assim."

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme variables supporting light/dark modes
- **Mobile First**: PWA-ready with responsive design and manifest.json configured
- **Voice Input**: Web Speech API for speech-to-text input in AI chat (browser-native, no API required)

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful API endpoints prefixed with `/api/`
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **AI Integration**: Google Gemini via Replit's AI Integrations service for diagnostics, chat, and image generation

### Authentication System (Local Auth - Enterprise Security)
- **Type**: Custom email/password authentication with JWT tokens
- **Password Hashing**: bcryptjs with 12 salt rounds
- **Tokens**: JWT access tokens (15min) + refresh tokens (7 days)
- **Security Features**:
  - Rate limiting on login (10 attempts per 15min)
  - Rate limiting on registration (5 per hour)
  - Rate limiting on password reset (3 per hour)
  - Account lockout after 5 failed attempts (15 min)
  - Strong password validation (8+ chars, uppercase, lowercase, number, special char)
  - CPF validation (Brazilian ID)
- **Routes**:
  - POST `/api/auth/register` - User registration with CPF, email, phone, age, city
  - POST `/api/auth/login` - Email/password login
  - POST `/api/auth/refresh` - Refresh access token
  - POST `/api/auth/logout` - Session destruction
  - POST `/api/auth/forgot-password` - Password reset request
  - POST `/api/auth/reset-password` - Password reset with token
  - GET `/api/auth/me` - Get current user
- **Future Enhancement**: Twilio SMS integration for OTP verification (not configured yet)

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Auth Schema**: `shared/models/auth.ts` contains users, sessions, and password reset tokens
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Key Tables**: users, sessions, userProfiles, serviceCategories, serviceRequests, serviceChatMessages, reviews, conversations, messages, systemSettings, payments, passwordResetTokens

### Key Domain Entities
- **Users**: Support three roles (client, provider, admin) with profiles containing specialties, ratings, availability, CPF, phone, age, and city
- **Service Requests**: Track full lifecycle from pending through diagnosis, provider assignment, progress, to completion
- **SLA Priorities**: Standard, express, and urgent tiers for service requests
- **Payments**: Pix and card options (simulated, structured for future Stripe integration)

### Admin Panel Features
- **User Management**: Filter by city, role, and search
- **City Overview**: Users grouped by city with stats
- **Pricing Controls**: AI diagnosis price, service fees, SLA multipliers
- **Backup**: Data export functionality

### Build System
- **Development**: TSX for running TypeScript directly, Vite dev server with HMR
- **Production**: esbuild bundles server code, Vite builds client assets to `dist/public`
- **Path Aliases**: `@/` maps to client/src, `@shared/` maps to shared folder

## Authentication Flow

### Client Registration/Login
1. User visits `/login/cliente` or `/cadastro/cliente`
2. Multi-step registration: Personal data → CPF, phone, age, city → Password creation
3. Password strength indicator with real-time validation
4. JWT tokens stored in localStorage
5. Automatic token refresh on expiration

### Provider Registration/Login
1. User visits `/login/prestador` or `/cadastro/prestador`
2. Same registration flow as clients with city selection for service area
3. Role automatically set to "provider"

### Admin Access
1. Admin role assigned by existing admin in user management
2. Admins access `/admin` for platform management
3. City-based user filtering for regional control

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with Zod schema validation

### Security
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token generation and verification
- **express-rate-limit**: API rate limiting

### AI Services
- **Google Gemini via Replit AI Integrations**: Requires `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL`
- **Supported Models**: gemini-2.5-flash (fast), gemini-2.5-pro (advanced reasoning), gemini-2.5-flash-image (image generation)

### UI Dependencies
- **Radix UI**: Comprehensive set of accessible component primitives
- **Lucide React**: Icon library
- **React Day Picker**: Calendar component
- **Embla Carousel**: Carousel functionality
- **Recharts**: Charting library for data visualization

## File Structure

```
client/src/pages/
├── auth/
│   ├── login.tsx         # Client and provider login pages
│   ├── register.tsx      # Client and provider registration pages
│   └── forgot-password.tsx # Password recovery flow
├── admin/
│   └── index.tsx         # Admin dashboard with user management
├── client/
│   ├── new-service.tsx   # AI diagnosis and service creation
│   └── service-details.tsx
├── provider/
│   └── index.tsx         # Provider dashboard
└── landing.tsx           # Landing page

server/
├── auth/
│   └── localAuth.ts      # Local authentication with JWT
├── routes.ts             # API routes
└── storage.ts            # Database operations
```
