This is the MentorBridge web application built with Next.js App Router and Supabase.

## Admin Portal Auth (Implemented)

This project now includes a secure admin portal flow with:

- Separate route at `/admin/login`
- Admin-only access check against `profiles.role = 'admin'`
- Lockout after 5 consecutive failed login attempts
- Session expiration after 8 hours of inactivity

### Required setup

1. Copy `.env.local.example` into `.env.local` (if not already done).
2. Fill:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- `SUPABASE_SERVICE_ROLE_KEY`

> Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it in client code.

### Seed first admin account

Run the terminal command below from the project root:

```bash
npm run seed:admin -- --email admin@mentorbridge.pk --password "YourStrongPassword123!" --name "Platform Admin"
```

Optional flags:

- `--reset-password`: Resets password if the user already exists.
- `--help`: Shows usage information.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Key routes:

- `/` - landing page
- `/admin/login` - admin login portal
- `/admin` - protected admin dashboard

You can start editing pages in `src/app`. The page auto-updates as you edit files.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
