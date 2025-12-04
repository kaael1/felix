# SendMoney AI Agent

A conversational AI agent built with Next.js that guides users through a money transfer process, intelligently collecting and validating transaction details using Google's Gemini AI.

## Features

- 🤖 **AI-Powered Chat**: Uses Google Gemini 2.5 Flash for natural language processing
- 💬 **Conversational Interface**: Friendly chat-based UI for collecting transfer information
- 📊 **Live State Tracking**: Real-time visualization of collected transfer details
- ✅ **Smart Validation**: Validates countries and delivery methods automatically
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. Install dependencies:
```bash
npm install
# or
bun install
```

2. Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_api_key_here
```

Alternatively, you can use:
```env
API_KEY=your_api_key_here
```

3. Run the development server:
```bash
npm run dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # API endpoint for Gemini chat
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main chat interface
│   └── globals.css               # Global styles
├── components/
│   ├── ChatBubble.tsx            # Chat message component
│   └── StatePanel.tsx            # Transfer state visualization
├── services/
│   └── geminiService.ts          # Gemini AI service
└── types.ts                      # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

## How It Works

The agent collects four key pieces of information:
1. **Destination Country** - Where the money is being sent
2. **Amount** - Transfer amount (defaults to USD if currency not specified)
3. **Beneficiary Name** - Who is receiving the money
4. **Delivery Method** - Bank Deposit, Cash Pickup, or Mobile Wallet

The AI validates inputs against supported countries and methods, asks clarifying questions when needed, and confirms completion when all information is collected.

## Supported Countries

USA, Mexico, India, Philippines, Canada, UK, Brazil, France, Germany, Japan

## Supported Delivery Methods

- Bank Deposit
- Cash Pickup
- Mobile Wallet

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **AI**: Google Gemini 2.5 Flash
- **Icons**: Lucide React

## License

Private project
