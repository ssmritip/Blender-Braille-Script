# 3D Braille Generator

A Next.js application that converts text to 3D Braille models using Three.js and React Three Fiber.

## Features

- Real-time text to Braille conversion
- Interactive 3D preview with orbit controls
- Grade 1 Braille standard support
- Capital letter indicators
- GLB export for 3D printing
- WebGL context loss handling

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## WebGL Context Loss Handling

This application includes robust WebGL context loss handling to prevent crashes when the GPU context is lost. This can happen due to:

- GPU driver issues or crashes
- Browser memory limitations
- Tab suspension/backgrounding
- Hardware acceleration problems

### Features:

- Automatic context loss detection
- User-friendly error messages
- Retry mechanism (up to 3 attempts)
- Memory cleanup and disposal
- WebGL capability detection

### Troubleshooting WebGL Issues:

1. **Context Lost Error**: The app will display a retry button. Click to attempt restoration.
2. **Persistent Issues**: Try refreshing the page or restarting your browser.
3. **Hardware Acceleration**: Ensure hardware acceleration is enabled in your browser settings.
4. **Browser Support**: Use a modern browser with WebGL support (Chrome, Firefox, Safari, Edge).

## Technologies Used

- Next.js 14 with App Router
- React Three Fiber
- Three.js
- TypeScript
- Tailwind CSS
- Shadcn/ui components

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
