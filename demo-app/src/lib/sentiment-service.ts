// Sentiment Analysis Service for Demo App

import { CustomerSentimentHistory } from './types';

const RAG_API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:3336';

/**
 * Get historical sentiment data for a customer (mock data for demos)
 */
export async function getCustomerSentimentHistory(
  customerId: string,
  days: number = 90
): Promise<CustomerSentimentHistory | null> {
  try {
    const response = await fetch(
      `${RAG_API_URL}/api/sentiment/history/${encodeURIComponent(customerId)}?days=${days}`
    );

    if (!response.ok) {
      throw new Error(`History fetch failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Sentiment history error:', error);
    return null;
  }
}
