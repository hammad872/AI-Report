const axios = require('axios');

/**
 * Calls Groq API (Llama 3.3 70B)
 */
const callGroq = async (systemPrompt, userPrompt) => {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 8000,
        temperature: 0.3
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        timeout: 60000
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    throw new Error(`Groq API error: ${error.response?.data?.error?.message || error.message}`);
  }
};

/**
 * Calls Claude API (Sonnet 4)
 */
const callClaude = async (systemPrompt, userPrompt) => {
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      },
      {
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: 60000
      }
    );

    return response.data.content[0].text;
  } catch (error) {
    throw new Error(`Claude API error: ${error.response?.data?.error?.message || error.message}`);
  }
};

/**
 * Routes to correct AI provider based on environment variable
 */
const generateReport = async (systemPrompt, userPrompt) => {
  const provider = process.env.AI_PROVIDER || 'groq';

  console.log(`Generating report with ${provider}...`);

  try {
    let response;
    if (provider === 'claude') {
      response = await callClaude(systemPrompt, userPrompt);
    } else {
      response = await callGroq(systemPrompt, userPrompt);
    }

    return response;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateReport,
  callGroq,
  callClaude
};