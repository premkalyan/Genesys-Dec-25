// SLM Service - Connects to local Bounteous SLM via Next.js API proxy

interface SLMResponse {
  answer: string;
  source: string;
  latency: number;
  cost: number;
}

interface SLMAPIResponse {
  answer?: string;
  response?: string;
  source?: string;
  sources?: string[];
  citation?: string;
  latency?: number;
  cost?: number;
  error?: string;
  message?: string;
}

export async function querySLM(query: string): Promise<SLMResponse> {
  const startTime = performance.now();

  try {
    const response = await fetch('/api/slm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: query }),
    });

    const data: SLMAPIResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || `API error: ${response.status}`);
    }

    const clientLatency = Math.round(performance.now() - startTime);

    // Handle different response formats from the SLM
    const answer = data.answer || data.response || 'No response from SLM';
    const source = data.source || data.citation ||
      (data.sources && data.sources.length > 0 ? data.sources.join(', ') : 'Bounteous Policy Documents');

    return {
      answer,
      source,
      latency: data.latency || clientLatency,
      cost: data.cost || 0.0001,
    };
  } catch (error) {
    console.error('SLM query failed:', error);
    const latency = Math.round(performance.now() - startTime);

    return {
      answer: `Unable to reach SLM service. Please ensure the model is running. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      source: 'System Error',
      latency,
      cost: 0,
    };
  }
}

// Health check function
export async function checkSLMHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/slm', {
      method: 'GET',
    });
    const data = await response.json();
    return data.healthy === true;
  } catch {
    return false;
  }
}

// For comparison - simulated GPT-4 response (mock for demo purposes)
export async function queryGPT4Mock(query: string): Promise<SLMResponse> {
  // Simulate GPT-4 latency (250-400ms)
  const latency = Math.floor(Math.random() * 150) + 250;
  await new Promise(resolve => setTimeout(resolve, latency));

  return {
    answer: 'This would be a GPT-4 response (not connected for demo)',
    source: 'GPT-4 (no source citation available)',
    latency,
    cost: 0.02,
  };
}
