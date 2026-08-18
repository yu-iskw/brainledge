const spaceId = 'ks_default';

async function remember(): Promise<void> {
  const input = document.querySelector('#remember-input');
  if (!(input instanceof HTMLTextAreaElement)) {
    return;
  }
  await fetch(`/api/v1/spaces/${spaceId}/memories`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: input.value }),
  });
}

async function recall(): Promise<void> {
  const input = document.querySelector('#recall-input');
  const output = document.querySelector('#recall-output');
  if (!(input instanceof HTMLInputElement) || !(output instanceof HTMLElement)) {
    return;
  }
  const response = await fetch(`/api/v1/spaces/${spaceId}/recall`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: input.value }),
  });
  output.textContent = await response.text();
}

document.querySelector('#remember-button')?.addEventListener('click', () => {
  void remember();
});
document.querySelector('#recall-button')?.addEventListener('click', () => {
  void recall();
});
