/**
 * Groq API Integration for Transaction Description Cleaning
 * 
 * Uses Groq's LLM API to intelligently clean and shorten transaction descriptions
 * API key is automatically read from environment variable VITE_GROQ_API_KEY
 */

const GROQ_API = {
  hostname: 'api.groq.com',
  path: '/openai/v1/chat/completions',
  model: 'llama-3.3-70b-versatile',
  temperature: 0.1,
  maxTokens: 4000,
};

/**
 * Get Groq API key from environment
 */
function getGroqApiKey(): string {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GROQ_API_KEY environment variable is not set');
  }
  return apiKey;
}

interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

/**
 * Build the prompt for cleaning transaction descriptions
 */
function buildCleaningPrompt(descriptions: string[]): string {
  return `Clean and summarize these bank transaction descriptions. Make them SHORT and ESSENTIAL only.

Rules:
- For peer-to-peer transfers: keep the person's name exactly as provided. "Received from John Smith" → "Received from John Smith" (NOT just "Transfer" or "Money received")
- For transfers: "Transfer to [Name]" or "Transfer from [Name]" - preserve the full name
- For ATM: "ATM Withdrawal"
- For purchases: "[Merchant Name]" only
- For refunds: "Refund from [Merchant]"
- IMPORTANT: Extract and preserve person names from descriptions that mention them
- Remove technical details, amounts, card numbers, balances, email addresses
- Maximum 5-7 words per description
- Keep names in proper title case (capitalize first letter of each word)

Return ONLY a JSON array of cleaned descriptions in the EXACT same order:
["cleaned description 1", "cleaned description 2", ...]

Descriptions to clean:
${descriptions.map((d, i) => (i + 1) + '. ' + d).join('\n')}`;
}

/**
 * Call Groq API to clean descriptions
 * API key is automatically read from environment variable
 */
export async function cleanDescriptionsWithGroq(
  descriptions: string[]
): Promise<string[]> {
  if (descriptions.length === 0) {
    return [];
  }

  const apiKey = getGroqApiKey();
  const prompt = buildCleaningPrompt(descriptions);

  const requestBody = {
    model: GROQ_API.model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: GROQ_API.temperature,
    max_tokens: GROQ_API.maxTokens,
  };

  try {
    const response = await fetch(`https://${GROQ_API.hostname}${GROQ_API.path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as GroqResponse;
      const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json() as GroqResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('API response is missing content');
    }

    // Extract JSON array from response
    const jsonMatch = new RegExp(/\[[\s\S]*\]/).exec(content);

    if (!jsonMatch) {
      throw new Error('Could not parse JSON from API response');
    }

    const cleanedDescriptions = JSON.parse(jsonMatch[0]) as string[];

    if (!Array.isArray(cleanedDescriptions)) {
      throw new TypeError('API response is not an array of descriptions');
    }

    if (cleanedDescriptions.length !== descriptions.length) {
      throw new Error(
        `Mismatch: Got ${cleanedDescriptions.length} cleaned descriptions but expected ${descriptions.length}`
      );
    }

    return cleanedDescriptions;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Groq API Error: ${error.message}`);
    }
    throw new Error('Unknown error calling Groq API');
  }
}
