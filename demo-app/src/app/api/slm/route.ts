import { NextRequest, NextResponse } from 'next/server';

const SLM_BASE_URL = 'http://127.0.0.1:7860';

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    const body = await request.json();
    const { question } = body;

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${SLM_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      throw new Error(`SLM API error: ${response.status}`);
    }

    const data = await response.json();
    const latency = Math.round(performance.now() - startTime);

    return NextResponse.json({
      ...data,
      latency,
      cost: 0.0001,
    });
  } catch (error) {
    const latency = Math.round(performance.now() - startTime);
    console.error('SLM proxy error:', error);

    return NextResponse.json(
      {
        error: 'Failed to reach SLM service',
        message: error instanceof Error ? error.message : 'Unknown error',
        latency,
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch(`${SLM_BASE_URL}/health`);
    const healthy = response.ok;

    return NextResponse.json({ healthy });
  } catch {
    return NextResponse.json({ healthy: false });
  }
}
