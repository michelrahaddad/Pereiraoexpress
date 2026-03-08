# Pereirão Express - Home Services Platform

## Overview

Pereirão Express is a home services marketplace application designed to connect clients with qualified service providers (electricians, plumbers, painters, etc.). The platform integrates AI-powered diagnostics using Google's Gemini to assist users in describing their problems and receiving instant assessments. It supports three distinct user roles: clients who request services, providers who fulfill them, and administrators who manage the platform. The project aims to provide a seamless, efficient, and transparent experience for home service transactions, leveraging technology to streamline problem diagnosis, service booking, and provider management.

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
The frontend is built with React 18 and TypeScript, using Vite for development and bundling. It employs Wouter for lightweight routing and TanStack React Query for state management and caching. UI components are sourced from shadcn/ui, based on Radix UI primitives, styled with Tailwind CSS supporting light/dark modes. The application is PWA-ready with a mobile-first responsive design. Voice input for the AI chat utilizes the Web Speech API.

### Backend Architecture
The backend is an Express.js application built with TypeScript, exposing RESTful API endpoints prefixed with `/api/`. Session management is handled via PostgreSQL-backed sessions using `connect-pg-simple`. AI integration for diagnostics, chat, and image generation is provided by Google Gemini through Replit's AI Integrations service.

### Authentication System
A custom email/password authentication system is implemented using JWT tokens (15min access, 7-day refresh). Security features include bcryptjs for password hashing (12 salt rounds), rate limiting on login, registration, and password reset, and account lockout mechanisms. Strong password validation and Brazilian CPF validation are also included.

### Data Layer
PostgreSQL is the primary database, accessed via Prisma ORM. The `prisma/schema.prisma` defines 35 models, with a generated Prisma client. A singleton Prisma client is used with a `pg` pool adapter. A storage repository handles 126 methods, including snake_case to camelCase mapping.

### Key Domain Entities
The system models Users (client, provider, admin roles with profiles including specialties, ratings, availability, geolocation), Service Requests (tracking lifecycle, including optional scheduling), and Provider Availability (weekly schedules to filter providers). Slot occupation is managed based on estimated service duration. SLA priorities (Standard, Express, Urgent) are supported, and payment options include Pix and card (simulated for future Stripe integration).

### Public AI Diagnosis Flow
A public, no-login-required AI diagnosis flow allows users to describe problems, receive AI-guided questions, and get a diagnosis. Diagnosis data is saved to `sessionStorage` for non-authenticated users, allowing them to create an account or log in and resume the service creation process. Authenticated users proceed directly to provider selection.

### Geolocation System
The system calculates distances using the Haversine formula, filtering providers within a 30km radius of the client's location. Browser Geolocation API captures client location, with a fallback to showing all providers if location is unavailable.

### Admin Panel Features
The admin panel provides user management (filtering by city, role, search), a city overview with user statistics, and comprehensive pricing controls configurable via the `system_settings` table (e.g., AI diagnosis fee, platform fees, SLA multipliers).

### AI Symptom Knowledge Base
A structured knowledge base for AI diagnosis includes Symptoms linked to service categories, Symptom Questions with conditional logic, Symptom Diagnoses with price ranges and urgency, and Local Knowledge for city-specific service information. This knowledge base provides context to Gemini during diagnosis, featuring accent normalization and token limit protection.

### Notification System
The application features an in-app notification system with real-time updates (polling every 30 seconds) and browser-native push notifications via a service worker, triggered automatically upon events like provider selection.

### Twilio Voice Integration
The system is prepared for Twilio Voice integration to enable an AI secretary (using Gemini) to conduct phone calls with providers, explaining services and gathering acceptance or rejection.

### Build System
Development uses TSX and Vite, while production builds utilize esbuild for the server and Vite for client assets. Compatibility between CJS and ESM modules is handled for Prisma's generated client.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.

### Security
- **bcryptjs**: For password hashing.
- **jsonwebtoken**: For JWT token generation and verification.
- **express-rate-limit**: For API rate limiting.

### Communication
- **Twilio**: For voice calls (requires credentials).
- **Amazon Polly**: For text-to-speech (Camila voice for Brazilian Portuguese) in Twilio integration.

### AI Services
- **Google Gemini via Replit AI Integrations**: For AI diagnostics, chat, and image generation. Supports `gemini-2.5-flash`, `gemini-2.5-pro`, and `gemini-2.5-flash-image` models.

### UI Dependencies
- **Radix UI**: Accessible UI component primitives.
- **Lucide React**: Icon library.
- **React Day Picker**: Calendar component.
- **Embla Carousel**: Carousel functionality.
- **Recharts**: Charting library.