"use server";

import { recommendPriceAdjustments, type RecommendPriceAdjustmentsInput, type RecommendPriceAdjustmentsOutput } from '@/ai/flows/recommend-price-adjustments';

export async function getPriceRecommendations(input: RecommendPriceAdjustmentsInput): Promise<RecommendPriceAdjustmentsOutput | { error: string }> {
  try {
    const result = await recommendPriceAdjustments(input);
    return result;
  } catch (error) {
    console.error("Error getting price recommendations:", error);
    // It's good practice to not expose raw error messages to the client
    // For a production app, log this error and return a generic message
    return { error: "Failed to get price recommendations. Please try again later." };
  }
}
