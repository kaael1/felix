import { NextRequest, NextResponse } from 'next/server';
import { processUserMessage } from '@/services/geminiService';
import { TransferState, Message } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userMessage, currentState, messageHistory } = body;

    // Validate required fields
    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { error: 'userMessage is required and must be a string' },
        { status: 400 }
      );
    }

    if (!currentState) {
      return NextResponse.json(
        { error: 'currentState is required' },
        { status: 400 }
      );
    }

    // Convert messageHistory timestamps from strings to Date objects if needed
    const normalizedHistory: Message[] = (messageHistory || []).map((msg: Message) => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
    }));

    const response = await processUserMessage(
      userMessage,
      currentState as TransferState,
      normalizedHistory
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

