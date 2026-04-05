/**
 * Gemini AI Helper (Client-side)
 * This file now calls our internal backend API to keep the API Key secure.
 */

export async function getChatResponse(history: { role: 'user' | 'model', parts: { text: string }[] }[], userMessage: string) {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage,
        history,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch AI response');
    }

    const data = await response.json();
    return data.text;
  } catch (error: any) {
    console.error('AI Assistant Error:', error);
    if (error.message && error.message.includes('API')) {
      return error.message;
    }
    return "ბოდიშს გიხდით, სერვერთან კავშირი ვერ მოხერხდა. გთხოვთ, სცადოთ მოგვიანებით ან დარწმუნდით, რომ ინტერნეტთან კავშირი გაქვთ.";
  }
}
