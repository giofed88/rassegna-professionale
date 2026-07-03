#!/usr/bin/env node

/**
 * conta-fino-3.mjs - Simple test script to demonstrate LLM counting
 * Uses ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, and ANTHROPIC_MODEL env vars
 */

const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1';
const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';

if (!authToken) {
  console.error('Error: ANTHROPIC_AUTH_TOKEN environment variable is required');
  process.exit(1);
}

console.log(`Using model: ${model}`);
console.log(`Base URL: ${baseUrl}\n`);

try {
  const response = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': authToken,
    },
    body: JSON.stringify({
      model,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Count from 1 to 3, each number on a new line. Output only the numbers.',
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`API Error (${response.status}):`, error);
    process.exit(1);
  }

  const data = await response.json();
  const text = data.content[0].text;

  console.log('Result:');
  console.log(text);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
