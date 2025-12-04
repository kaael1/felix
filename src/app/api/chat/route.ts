import { NextRequest, NextResponse } from 'next/server';
import { Message } from '@/types';

const PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL ||
  process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL ||
  'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userMessage, messageHistory, sessionId } = body;

    // Validate required fields
    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { error: 'userMessage is required and must be a string' },
        { status: 400 }
      );
    }

    // Convert messageHistory timestamps from strings to Date objects if needed
    const normalizedHistory: Message[] = (messageHistory || []).map((msg: Message) => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
    }));

    // Build URL with session_id as query parameter
    const url = new URL(`${PYTHON_SERVICE_URL.replace(/\/$/, '')}/api/chat`);
    if (sessionId) {
      url.searchParams.set('session_id', sessionId);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage,
        messageHistory: normalizedHistory,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorBody?.detail || 'Python service error' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

