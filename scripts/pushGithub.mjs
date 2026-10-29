import { execSync } from 'node:child_process';

async function main() {
  let token = '';
  try {
    const out = execSync('git credential-manager get', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const match = out.match(/password=(.+)/);
    if (match) token = match[1].trim();
  } catch (err) {
    console.error('No stored GitHub token found in credential manager:', err.message);
    process.exit(1);
  }

  if (!token) {
    console.error('Empty GitHub token');
    process.exit(1);
  }

  console.log('GitHub credential located. Ensuring RutaSync repository exists on GitHub...');
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'RutaSync-Provisioner',
    },
    body: JSON.stringify({
      name: 'RutaSync',
      description: 'RutaSync (RutaBanano) — PWA Offline-First con Firebase Cloud Firestore, control de rutas, inventario, cartera, cierre y auditoría inmutable',
      private: false,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    console.log(`Created GitHub repository: ${data.html_url}`);
  } else if (res.status === 422) {
    console.log('GitHub repository RutaSync already exists. Proceeding to push...');
  } else {
    const txt = await res.text();
    console.error(`GitHub API returned ${res.status}: ${txt}`);
    process.exit(1);
  }

  execSync('git push -u origin main', { stdio: 'inherit' });
  console.log('Successfully pushed main branch to https://github.com/rancamsoft-pixel/RutaSync');
}

main();
