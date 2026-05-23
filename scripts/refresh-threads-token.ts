import 'dotenv/config';

const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;

async function main(): Promise<void> {
  console.log('Refreshing Threads access token...');

  if (!THREADS_ACCESS_TOKEN) {
    console.error('ERROR: THREADS_ACCESS_TOKEN is not set.');
    console.error('Manually obtain a new token from Meta Developer Portal.');
    process.exit(1);
  }

  try {
    const url = new URL('https://graph.threads.net/refresh_access_token');
    url.searchParams.set('grant_type', 'th_refresh_token');
    url.searchParams.set('access_token', THREADS_ACCESS_TOKEN);

    const response = await fetch(url.toString());
    const data = await response.json() as Record<string, unknown>;

    if (!response.ok || !data.access_token) {
      console.error('ERROR: Token refresh failed.');
      console.error('API response:', JSON.stringify(data, null, 2));

      const errCode = (data.error as Record<string, unknown>)?.code;
      if (errCode === 190) {
        console.error('\nToken has expired. You must obtain a new token manually:');
        console.error('1. Go to https://developers.facebook.com/tools/explorer/');
        console.error('2. Select your Threads app');
        console.error('3. Generate a new user access token with threads_basic,threads_content_publish scopes');
        console.error('4. Exchange for a long-lived token:');
        console.error('   GET https://graph.threads.net/access_token?grant_type=th_exchange_token&client_id={app-id}&client_secret={app-secret}&access_token={short-lived-token}');
        console.error('5. Update THREADS_ACCESS_TOKEN in GitHub Secrets');
      }
      process.exit(1);
    }

    const newToken = data.access_token as string;
    const expiresIn = data.expires_in as number;
    const expiresInDays = Math.floor(expiresIn / 86400);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    console.log('SUCCESS: Token refreshed');
    console.log(`Expires in: ${expiresInDays} days (${expiresAt})`);

    if (process.env.GITHUB_OUTPUT) {
      const fs = await import('fs');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_token=${newToken}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `expires_at=${expiresAt}\n`);
      console.log('Token written to GITHUB_OUTPUT');
    } else {
      const masked = newToken.slice(0, 8) + '...' + newToken.slice(-4);
      console.log(`New token (masked): ${masked}`);
    }
  } catch (error) {
    console.error('ERROR: Unexpected error during token refresh:', error);
    process.exit(1);
  }
}

main().catch(console.error);
