# QuotaFlow

## Overview

QuotaFlow is a job search automation platform designed to help Australian job seekers meet their Workforce Australia compliance requirements. The application automates job applications, generates AI-tailored resumes for different industries, tracks application progress against monthly quotas, and produces compliance reports.

The platform targets users who need to apply to 20+ jobs per month to maintain government benefits, streamlining the process with AI-powered resume customization and automated job matching.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system (indigo/purple theme)
- **Charts**: Recharts for compliance meter visualization
- **Animations**: Framer Motion for page transitions

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Build**: esbuild for production bundling, Vite for development
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod validation

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` defines all tables
- **Migrations**: Drizzle Kit (`drizzle-kit push`)
- **Key Tables**: users, user_profiles, jobs, applications, tailored_resumes, sms_logs

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Implementation**: Passport.js with custom Replit OIDC strategy

### AI Integration
- **Resume Generation**: Anthropic Claude API for tailoring resumes to industries
- **Chat Features**: OpenAI API for conversational features
- **Image Generation**: OpenAI gpt-image-1 model

### Payment Processing
- **Provider**: Stripe (manual configuration via environment variables)
- **Sync Library**: stripe-replit-sync for webhook handling
- **Pricing**: $2 AUD/month subscription model
- **Note**: Stripe is configured manually using STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY secrets (not via Replit connector UI due to setup limitations)

## External Dependencies

### Third-Party Services
- **Stripe**: Payment processing and subscription management (connected via Replit)
- **Anthropic Claude**: AI resume tailoring (`@anthropic-ai/sdk`)
- **OpenAI**: Chat and image generation capabilities
- **Resend**: Email notifications for application confirmations (connected via Replit)

### Database
- **PostgreSQL**: Primary data store (provisioned via Replit)
- **Connection**: `DATABASE_URL` environment variable required

### Job Board APIs (Planned)
- **Adzuna**: External job listings integration (not yet implemented)
- Currently uses mock/seeded job data

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Express session encryption key
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`: Claude API access
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API access
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key (manually configured)
- `STRIPE_SECRET_KEY`: Stripe secret key (manually configured)
- Resend credentials auto-configured via Replit connector