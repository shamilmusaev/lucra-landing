// Site-wide configuration. Fill in the real client values here.

// Calendly scheduling link used by every "Boka demo" button (opens as a popup
// via CalendlyPopup.astro). Replace with the client's real event URL,
// e.g. https://calendly.com/lucra/demo
export const CALENDLY_URL = 'https://calendly.com/OWNER/demo';

// Public contact e-mail shown in the CTA section (mailto link).
export const CONTACT_EMAIL = 'kontakt@lucra.ai';

// Endpoint that receives contact-form submissions (JSON POST) and relays them
// via AWS SES. Point this at the Lambda Function URL / API Gateway URL once it
// exists. Until then the form will surface its error state on submit.
export const FORM_ENDPOINT = 'https://REPLACE-WITH-YOUR-SES-ENDPOINT';
