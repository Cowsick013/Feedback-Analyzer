const fetch = require('node-fetch');

async function callOllama(prompt) {
  let response;

  try {
    response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3:mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 800,
          num_ctx: 2048
        }
      })
    });
  } catch (err) {
    throw new Error('Could not reach Ollama. Make sure it is running: ollama serve');
  }

  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}`);
  }

  const data = await response.json();

  // DEBUG — print the full response so we can see the exact structure
  console.log('🔍 Full Ollama response:');
  console.log(JSON.stringify(data, null, 2));

  if (!data.message || !data.message.content) {
    throw new Error('Ollama returned empty response.');
  }

  return data.message.content;
}

module.exports = { callOllama };