### The frontend folder structure can be auto generated via nextjs build

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

After pulling the changes from the repository, go to the `/frontend` folder and run `pnpm install` to install the required dependencies.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev # use this
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Frontend Folder Structure

```bash
frontend/
├── public/                                 # static assets (images, icons, etc.)
│
├── src/                                    # all source code
│   ├── app/                                # Next.js routes (App Router)
│   │   ├── layout.tsx                      # root layout
│   │   ├── page.tsx                        # landing page
│   │   ├── accounts/
│   │   │   ├── login/page.tsx              # login page
│   │   │   ├── sign-up/page.tsx            # sign up page
│   │   │   └── profile/page.tsx            # profile page
│   │   ├── home/                            
│   │   │   ├── layout.tsx                  # root layout for home page
│   │   │   ├── dashboard/page.tsx          # dashboard page
│   │   │   ├── practice-history/page.tsx   # practice history page
│   │   │   └── question-bank/page.tsx      # question bank/catalogue page
│   │   ├── matching/page.tsx               # matching pop-up (could be a component)
│   │   └── collaboration/page.tsx          # collaboration page
│   │
│   ├── components/
│   │   ├── ui/                             # buttons, cards, etc.
│   │   ├── layout/                         # navbar, sidebar, etc.
│   │   └── charts/                         # stats/visualizations for dashboard
│   │
│   ├── styles/                             # global styles
│   │   ├── globals.css
│   │   ├── theme.ts
│   │   └── fonts.ts
│   │
│   ├── hooks/
│   │
│   ├── lib/                                # helpers, utils, API clients
│   │   ├── definitions.ts
│   │   └── utils.ts
│
├── next.config.ts
├── package.json
├── README.md
└── tsconfig.json
```