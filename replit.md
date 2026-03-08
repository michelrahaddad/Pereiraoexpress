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
- **Database**: PostgreSQL with Prisma ORM (migrated from Drizzle)
- **Prisma Schema**: `prisma/schema.prisma` contains all 35 model definitions
- **Generated Client**: `generated/prisma/` - Prisma client output with `@prisma/adapter-pg` driver adapter
- **Prisma Client Singleton**: `server/infrastructure/prisma/client.ts` - uses pg pool with Prisma adapter
- **Storage Repository**: `server/infrastructure/repositories/prisma-storage.ts` - 126 methods, handles snake_case→camelCase mapping
- **Auth Adapter**: `server/infrastructure/auth/prisma-auth.ts` - JWT auth with Prisma queries
- **Routes**: `server/infrastructure/routes/prisma-routes.ts` - all 124 API endpoints using Prisma storage
- **Key Tables**: users, sessions, user_profiles, service_categories, service_requests, service_chat_messages, reviews, conversations, messages, system_settings, payments, password_reset_tokens, symptoms, symptom_questions, symptom_diagnoses, local_knowledge, provider_availability
- **Legacy Files (preserved)**: `server/routes.ts`, `server/storage.ts`, `server/auth/localAuth.ts`, `shared/schema.ts` - original Drizzle-based code kept for reference

### Key Domain Entities
- **Users**: Support three roles (client, provider, admin) with profiles containing specialties, ratings, availability, CPF, phone, age, city, and geolocation (latitude/longitude)
- **Service Requests**: Track full lifecycle from pending through diagnosis, provider assignment, progress, to completion; includes optional scheduledDate for appointment scheduling
- **Provider Availability**: Weekly schedule with day_of_week (0=Sun to 6=Sat), start_time/end_time (HH:MM), is_active toggle; providers without any active availability slots are hidden from client search results
- **SLA Priorities**: Standard, express, and urgent tiers for service requests
- **Payments**: Pix and card options (simulated, structured for future Stripe integration)

### Public AI Diagnosis Flow (No Login Required)
- **Landing Page**: "Descrever meu problema" button goes directly to `/client/new`
- **Diagnosis Flow**: Guided questions → AI Chat → Diagnosis result — all free, no login required
- **Public Endpoints**:
  - POST `/api/ai/diagnose` - AI chat streaming (no auth required)
  - POST `/api/diagnosis/preview` - Generate diagnosis without creating DB records (no auth required)
- **After Diagnosis**: Non-authenticated users see "Criar conta e continuar" / "Já tenho conta — Entrar" buttons
- **Resume Flow**: Diagnosis data saved to `sessionStorage` under key `pereirao_diagnosis`
  - Login/register pages detect `?from=diagnosis` parameter
  - After auth, user redirected to `/client/new?resume=true`
  - Resume logic reads sessionStorage, calls authenticated `/api/diagnosis/ai` to create service, then redirects to provider selection
- **Authenticated Users**: See "Continuar para contratar" button directly after diagnosis

### Geolocation System
- **Distance Calculation**: Haversine formula in `shared/geolocation.ts` for accurate distance calculation
- **Provider Filtering**: Clients only see providers within 30km radius
- **Location Capture**: Browser Geolocation API captures client location automatically
- **Fallback**: If location unavailable, shows all providers without distance filtering
- **Distance Display**: Shows distance in km next to each provider
- **Routes**:
  - PATCH `/api/user/location` - Update user's latitude/longitude
  - GET `/api/providers/available?lat=X&lon=Y` - Filter providers by distance

### Admin Panel Features
- **User Management**: Filter by city, role, and search
- **City Overview**: Users grouped by city with stats
- **Pricing Controls**: All pricing is admin-configurable via system_settings table
  - AI diagnosis fee (default R$10), platform fee for repairs (default 10%), SLA multipliers
  - Domestic services: base prices by house size, frequency multipliers, service type multipliers, platform fee (15%)
  - GET `/api/settings/pricing` - Public endpoint for frontend to read current pricing
  - All pricing reads from admin settings with fallback to defaults
- **Backup**: Data export functionality
- **Sintomas IA**: Manage symptom knowledge base for AI diagnosis improvement

### AI Symptom Knowledge Base
- **Symptoms**: Linked to service categories with keywords for matching
- **Symptom Questions**: Refinement questions per symptom with expected responses and trigger keywords
- **Conditional Questions**: Questions can be configured with trigger keywords (e.g., "vazamento" triggers water pressure/color questions)
- **Symptom Diagnoses**: Possible diagnoses with price ranges, materials, and urgency levels
- **Local Knowledge**: City-specific service information (material suppliers, service particularities)
- **AI Integration**: Knowledge base is automatically queried during diagnosis to provide context to Gemini
- **Conditional Question Logic**:
  - If user mentions "vazamento/água" → AI asks about water pressure and color
  - If user mentions "elétrica/tomada" → AI asks about circuit breaker and burning smell
  - If user mentions "entupimento" → AI asks about location and water backflow
  - If user mentions "portão/motor" → AI asks about gate type and motor sounds
- **Features**: Accent normalization for Portuguese, safe JSON parsing, token limit protection (2000 chars)

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

### Notification System
- **In-App Notifications**: Bell icon in header with unread count badge
- **Real-time Updates**: Polling every 30 seconds for new notifications
- **Notification Types**: service_request, service_accepted, service_rejected, service_completed, payment_received, new_message, call_requested
- **Auto-trigger**: Notifications created when client selects a provider
- **Push Notifications**: Browser-native push via web-push library
  - Toggle button in header to enable/disable
  - Service worker (sw.js) handles background notifications
  - Sent automatically when client selects provider
  - Required secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
  - Routes: GET `/api/push/vapid-public-key`, POST `/api/push/subscribe`, POST `/api/push/unsubscribe`

### Twilio Voice Integration (Ready for Credentials)
- **AI Secretary**: Uses Gemini to conduct phone calls with providers
- **Call Flow**: Greet provider → Explain service → Gather accept/reject → Update database
- **TwiML Webhooks**: `/api/twilio/webhook/status`, `/api/twilio/webhook/voice`, `/api/twilio/webhook/gather`
- **Required Secrets**: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- **Status**: API ready, awaiting Twilio credentials from user

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with Zod schema validation

### Security
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token generation and verification
- **express-rate-limit**: API rate limiting

### Communication (Prepared)
- **Twilio**: Voice calls to providers (requires credentials)
- **Voice Model**: Amazon Polly Camila (Brazilian Portuguese)

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
├── infrastructure/
│   ├── prisma/
│   │   └── client.ts         # Prisma client singleton with pg adapter
│   ├── repositories/
│   │   └── prisma-storage.ts # 126 storage methods (IStorage implementation)
│   ├── auth/
│   │   └── prisma-auth.ts    # JWT auth with Prisma queries
│   └── routes/
│       └── prisma-routes.ts  # All 124 API endpoints
├── domain/
│   └── entities/
│       └── index.ts          # 35 entity interfaces + enums + errors
├── auth/
│   └── localAuth.ts          # Legacy: Local auth with Drizzle (preserved)
├── routes.ts                 # Legacy: API routes with Drizzle (preserved)
├── storage.ts                # Legacy: Drizzle storage (preserved)
└── index.ts                  # Express app entry point (uses Prisma routes)
```
