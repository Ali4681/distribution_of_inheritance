# Distribution of Inheritance

A full-stack web application for managing inheritance cases, building family trees, calculating heirs' shares, and generating Arabic or English reports.

> **Important:** This software is an administrative and calculation aid. Inheritance rules can vary by jurisdiction and individual circumstances. Results should be reviewed by a qualified legal or religious authority before they are relied upon.

## Features

- User registration and JWT-based authentication
- Role-based access for users and administrators
- Inheritance case management with estate costs, debts, wills, currencies, and properties
- Interactive family-tree visualization
- Calculation of eligible heirs, fractions, percentages, and monetary values
- Identification of fully or partially blocked heirs with reasons
- Arabic and English PDF reports
- User management and audit logs for administrators
- Responsive Arabic-first interface
- Postman collection for API testing

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Visualization | React Flow, Dagre, Recharts, Framer Motion |
| Backend | NestJS 11, TypeScript, JWT, PDFKit |
| Database | PostgreSQL, Prisma ORM 7 |

## Project Structure

```text
distribution_of_inheritance/
├── backend/        # NestJS REST API, Prisma schema, migrations, and seed data
├── frontend/       # Next.js web application
├── postman/        # Postman API collection
└── README.md
```

## Prerequisites

- Node.js 20.9 or newer
- npm
- PostgreSQL

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd distribution_of_inheritance
```

### 2. Configure and start the backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/inheritance?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=8000
CORS_ORIGIN="http://localhost:3000"
```

Apply the database migrations, generate the Prisma client, and optionally load the demonstration data:

```bash
npx prisma migrate deploy
npx prisma generate
npm run seed
npm run dev
```

The API will be available at `http://localhost:8000/api`.

### 3. Configure and start the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:8000/api"
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Accounts

Running `npm run seed` in the backend creates these accounts:

| Role | Email | Default password |
| --- | --- | --- |
| Administrator | `admin@inheritance.local` | `Admin@123456` |
| User | `user@inheritance.local` | `User@123456` |

The defaults can be changed before seeding with `SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD`, and `SEED_INACTIVE_PASSWORD` in `backend/.env`. Never use the default passwords in production.

## Available Scripts

### Frontend

Run these commands from `frontend/`:

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run start    # Run the production build
npm run lint     # Check the code with ESLint
```

### Backend

Run these commands from `backend/`:

```bash
npm run dev         # Start the API in watch mode
npm run build       # Compile the application
npm run start:prod  # Run the compiled application
npm run lint        # Check and fix lint issues
npm run test        # Run unit tests
npm run test:e2e    # Run end-to-end tests
npm run test:cov    # Run tests with coverage
npm run seed        # Load demonstration data
```

## Environment Variables

### Backend

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Production | Secret used to sign authentication tokens |
| `PORT` | No | API port; defaults to `8000` |
| `CORS_ORIGIN` | No | Allowed frontend origin; defaults to `*` |
| `SEED_ADMIN_PASSWORD` | No | Password assigned to the seeded administrator |
| `SEED_USER_PASSWORD` | No | Password assigned to the seeded user |
| `SEED_INACTIVE_PASSWORD` | No | Password assigned to the seeded inactive user |

### Frontend

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | No | API base URL; defaults to `http://localhost:8000/api` |

## API Collection

Import `postman/distribution_of_inheritance.postman_collection.json` into Postman to explore and test the REST API.

## Production Notes

- Use strong, unique values for `JWT_SECRET` and all account passwords.
- Restrict `CORS_ORIGIN` to the deployed frontend URL.
- Use a managed or backed-up PostgreSQL database.
- Apply migrations with `npx prisma migrate deploy` before starting the API.
- Build both applications with `npm run build` and serve them behind HTTPS.

## License

This repository is currently marked as `UNLICENSED`. Add a license file before distributing or accepting third-party contributions.
