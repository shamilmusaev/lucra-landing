// Single source of truth for off-site destinations (app + contact).
// Swap APP_URL here when the production app domain changes.
export const APP_URL = 'https://app.lucra-app.ai';
export const APP_LOGIN_URL = `${APP_URL}/login`;
export const CONTACT_EMAIL = 'simon@lucra-app.ai';
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;
// All "Boka demo" CTAs across the site point here.
export const BOOK_DEMO_URL = 'https://calendly.com/simon-lucra-app/30min?back=1';
// Contact-form endpoint: receives a JSON POST (roll/namn/epost/foretag/meddelande)
// and relays it via AWS SES. TODO: replace with the real Lambda Function URL / API
// Gateway URL once the backend is live — until then the form surfaces its error
// state on submit.
export const FORM_ENDPOINT = 'https://REPLACE-WITH-YOUR-SES-ENDPOINT';
