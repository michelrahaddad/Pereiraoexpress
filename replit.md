# Pereirão Express - Home Services Platform

## Overview

Pereirão Express is a home services marketplace application that connects clients with qualified service providers (electricians, plumbers, painters, etc.). The platform features AI-powered diagnostics using Google's Gemini to help users describe their problems and receive instant assessments. The app supports three user roles: clients who request services, providers who fulfill them, and admins who manage the platform.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme variables supporting light/dark modes
- **Mobile First**: PWA-ready with responsive design and manifest.json configured

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful API endpoints prefixed with `/api/`
- **Authentication**: Replit Auth integration using OpenID Connect (OIDC) with Passport.js
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **AI Integration**: Google Gemini via Replit's AI Integrations service for diagnostics, chat, and image generation

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Key Tables**: users, sessions, userProfiles, serviceCategories, serviceRequests, serviceChatMessages, reviews, conversations, messages

### Key Domain Entities
- **Users**: Support three roles (client, provider, admin) with profiles containing specialties, ratings, and availability
- **Service Requests**: Track full lifecycle from pending through diagnosis, provider assignment, progress, to completion
- **SLA Priorities**: Standard, express, and urgent tiers for service requests

### Build System
- **Development**: TSX for running TypeScript directly, Vite dev server with HMR
- **Production**: esbuild bundles server code, Vite builds client assets to `dist/public`
- **Path Aliases**: `@/` maps to client/src, `@shared/` maps to shared folder

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with Zod schema validation

### Authentication
- **Replit Auth**: OIDC-based authentication requiring `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables

### AI Services
- **Google Gemini via Replit AI Integrations**: Requires `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL`
- **Supported Models**: gemini-2.5-flash (fast), gemini-2.5-pro (advanced reasoning), gemini-2.5-flash-image (image generation)

### UI Dependencies
- **Radix UI**: Comprehensive set of accessible component primitives
- **Lucide React**: Icon library
- **React Day Picker**: Calendar component
- **Embla Carousel**: Carousel functionality
- **Recharts**: Charting library for data visualization