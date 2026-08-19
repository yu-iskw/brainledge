export const DEFAULT_UI_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Brainledge</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 52rem; }
      textarea, input { width: 100%; }
      pre { background: #f4f4f4; padding: 1rem; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h1>Brainledge</h1>
    <p>Standalone space <code>ks_default</code>. Phase 1 recall is lexical over episode text, plus fact hits after consolidate.</p>
    <section>
      <h2>Remember</h2>
      <textarea id="remember-input" rows="4"></textarea>
      <button id="remember-button" type="button">Remember</button>
      <p id="remember-status"></p>
    </section>
    <section>
      <h2>Recall</h2>
      <input id="recall-input" type="search" />
      <button id="recall-button" type="button">Recall</button>
      <pre id="recall-output"></pre>
    </section>
    <script>
      const spaceId = 'ks_default';
      document.getElementById('remember-button').addEventListener('click', async () => {
        const input = document.getElementById('remember-input');
        const status = document.getElementById('remember-status');
        const response = await fetch('/api/v1/spaces/' + spaceId + '/memories', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content: input.value }),
        });
        const body = await response.json();
        status.textContent = response.ok ? ('Saved ' + body.episodeId) : (body.error && body.error.message) || 'Remember failed';
      });
      document.getElementById('recall-button').addEventListener('click', async () => {
        const input = document.getElementById('recall-input');
        const output = document.getElementById('recall-output');
        const response = await fetch('/api/v1/spaces/' + spaceId + '/recall', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: input.value }),
        });
        const body = await response.json();
        if (!response.ok) {
          output.textContent = (body.error && body.error.message) || 'Recall failed';
          return;
        }
        const memories = (body.memories || []).map((hit) => hit.content).join('\\n---\\n');
        const facts = (body.facts || []).map((hit) => hit.summary).join('\\n');
        output.textContent = memories.length > 0 ? memories : 'No memories found.';
        if (facts.length > 0) {
          output.textContent += '\\n\\nFacts:\\n' + facts;
        }
      });
    </script>
  </body>
</html>
`;
