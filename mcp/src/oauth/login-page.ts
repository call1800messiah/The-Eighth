function escape(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export interface LoginPageOptions {
  requestId: string;
  clientName: string;
  redirectHost: string;
  error?: string;
}

/**
 * The page a GM sees while connecting Claude: who is asking, where it will
 * be redirected, and a login form. Self-contained, no scripts.
 */
export function loginPage({ requestId, clientName, redirectHost, error }: LoginPageOptions): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Claude verbinden</title>
<style>
  :root { color-scheme: dark; }
  body { background: #000; color: #efdc59; font: 16px/1.5 'Open Sans', Helvetica, Arial, sans-serif; margin: 0; }
  main { margin: 10vh auto; max-width: 420px; padding: 0 16px; }
  h1 { font-size: 22px; font-weight: normal; }
  p { margin: 0 0 12px; }
  .note { color: #aaa; font-size: 14px; }
  .error { border: 1px solid #dd0000; color: #ff6b6b; padding: 8px; }
  label { display: block; font-size: 13px; margin: 16px 0 4px; }
  input { background: #000; border: 1px solid #efdc59; box-sizing: border-box; color: #efdc59; font: inherit; height: 40px; padding: 0 8px; width: 100%; }
  button { background: #efdc59; border: 0; color: #000; cursor: pointer; font: inherit; height: 40px; margin-top: 24px; width: 100%; }
</style>
</head>
<body>
<main>
  <h1>Claude mit der Kampagne verbinden</h1>
  <p><strong>${escape(clientName)}</strong> möchte Personen, Orte und Quests lesen und als Entwürfe anlegen.</p>
  <p class="note">Entwürfe sieht nur die Spielleitung, bis sie sie freigibt. Danach geht es zurück zu ${escape(redirectHost)}.</p>
  <p class="note">Nur ein Spielleitungs-Konto kann die Verbindung erlauben. Sie lässt sich in der App unter „Claude“ jederzeit trennen.</p>
  ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
  <form method="post" action="/mcp/oauth/login" autocomplete="on">
    <input type="hidden" name="request_id" value="${escape(requestId)}">
    <label for="email">E-Mail</label>
    <input id="email" name="email" type="email" autocomplete="username" required autofocus>
    <label for="password">Passwort</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Verbindung erlauben</button>
  </form>
</main>
</body>
</html>`;
}

export function errorPage(message: string): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Claude verbinden</title>
<style>body{background:#000;color:#efdc59;font:16px/1.5 Helvetica,Arial,sans-serif;margin:10vh auto;max-width:420px;padding:0 16px}</style></head>
<body><p>${escape(message)}</p></body></html>`;
}
