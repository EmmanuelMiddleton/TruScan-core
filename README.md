# TruScan Systems - Workflow Automation Platform

A full-stack application for managing workflow automation referrals, agent tracking, and lead management.

## 🚀 Features

- **Agent Management**: Track agent performance, earnings, and referrals.
- **Lead Funnel**: Manage leads through various stages (Captured, Contacted, Qualified, etc.).
- **Secure Authentication**: WhatsApp OTP-based authentication for both Admins and Agents.
- **Real-time Dashboards**: Interactive dashboards for Admins and Agents using Recharts.
- **Supabase Integration**: Robust data storage and session management.
- **Production Ready**: Optimized for deployment on Vercel or other serverless platforms.

## 🛠️ Setup Instructions

### 1. Supabase Setup

1. Create a new project at [Supabase](https://supabase.com).
2. Go to the **SQL Editor** and run the contents of `supabase_schema.sql` to set up your tables.
3. Go to **Project Settings > API** and copy your `URL` and `anon public` key.

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Admin Configuration
ADMIN_CODE=your_secure_admin_code_for_initial_setup

# Application Mode
# Set to 'false' for production to disable all mock data and fallbacks
MOCK_MODE=true

# Server Configuration
PORT=3000
```

> **Note:** In production (e.g., Vercel), ensure `MOCK_MODE` is set to `false` to enforce strict database interactions and disable debug endpoints.

### 3. Installation

```bash
npm install
```

### 4. Local Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### 5. Deployment (Vercel)

1. Connect your GitHub repository to Vercel.
2. Add the environment variables from your `.env` file to the Vercel project settings.
3. Vercel will automatically detect the build settings and deploy your app.

## 📁 Project Structure

- `server.ts`: Express backend with Vite middleware.
- `src/`: React frontend source code.
- `src/components/`: UI components (Admin/Agent Dashboards, Landing Page, etc.).
- `supabase_schema.sql`: Database schema definitions.

## ⚖️ License

Private - TruScan Systems (Pty) Ltd.
