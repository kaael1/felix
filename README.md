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
- Python 3.11+
- A Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. Install frontend dependencies:
```bash
npm install
# or
bun install
```

2. Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_api_key_here
PYTHON_SERVICE_URL=http://localhost:8000
```

3. Set up the Python backend:
```bash
python -m venv .venv
source .venv/bin/activate      # Linux/Mac
# or
.venv\Scripts\activate         # Windows PowerShell
pip install -r requirements.txt
```

4. Run the development servers:
```bash
npm run dev:python   # start FastAPI + ADK agent
npm run dev          # start Next.js
# or run both
npm run dev:all
# or use the Makefile
make dev-backend     # (same as npm run dev:python)
make dev-frontend    # (same as npm run dev)
make dev             # (same as npm run dev:all)
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Starting services independently

- **Backend only**
  ```bash
  # manual
  source .venv/bin/activate      # or .\.venv\Scripts\Activate.ps1
  uvicorn backend.main:app --reload --port 8000

  # or via npm / make
  npm run dev:python
  make dev-backend
  ```
- **Frontend only**
  ```bash
  npm run dev
  make dev-frontend
  ```

Ensure the backend is already running (port `8000`) before starting the frontend, otherwise the Next.js proxy will return errors.

### Docker workflow

You can run everything inside a single Docker container:

```bash
make docker-build           # docker build -t felix-app:latest .
make docker-run             # exposes 3000 (Next.js) and 8000 (FastAPI)
make docker-logs            # tail container logs
make docker-shell           # enter the container
make docker-stop            # stop the running container
```

All Docker commands load environment variables from `.env` automatically if the file exists.

## Project Structure

```
backend/
├── agent.py            # Google ADK LlmAgent wrapper
├── main.py             # FastAPI service
└── types.py            # Shared Pydantic models

src/
├── app/
│   ├── api/chat/route.ts  # Next.js API proxy → FastAPI
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ChatBubble.tsx
│   └── StatePanel.tsx
└── types.ts
```

## Available Scripts

- `npm run dev` / `make dev-frontend` - Start the Next.js dev server
- `npm run dev:python` / `make dev-backend` - Start the FastAPI + ADK backend
- `npm run dev:all` / `make dev` - Run both frontend and backend in parallel
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types
- `make install` - Install both frontend and backend dependencies
- `make docker-*` - Build, run, debug or stop the Docker container

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

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Backend**: FastAPI + Google Agent Development Kit (ADK)
- **AI Model**: Google Gemini 2.5 Flash
- **Icons**: Lucide React

## License

Private project
