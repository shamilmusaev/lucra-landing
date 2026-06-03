# Privacy Policy

_Last updated: March 27, 2026_

This Privacy Policy describes how LucrAI Tech AB collects, uses, and protects your personal data when you use our B2B AI-powered SaaS platform. This policy is designed to comply with the General Data Protection Regulation (GDPR) and applicable Swedish data protection law (Dataskyddslagen 2018:218).

## Introduction

Lucra AI is an artificial intelligence platform designed for businesses and accounting professionals to manage financial documents, analyze data, and streamline accounting workflows. The platform is intended solely for business-to-business (B2B) use.

### Data Controller

The data controller for personal data processed through the platform is:

- LucrAI Tech AB
- Sweden, EU
- Email: [privacy@lucra.ai](mailto:privacy@lucra.ai)

This Privacy Policy applies to all users of the Lucra AI platform, including our web application and any related services. By using our services, you acknowledge that you have read and understood this policy.

## Data We Collect

We collect the following categories of personal data:

### Account Data

- Full name and email address
- Password (stored only in hashed form using bcrypt; we never store or have access to your plaintext password)
- Company name and assigned role within the organization

### Files and Documents

- Financial documents you upload, including PDF, DOCX, TXT, and SIE files (Swedish standard accounting format)
- File metadata: file name, size, MIME type, SHA-256 checksum, and upload date

### AI Interaction Data

- Chat messages and queries sent to our AI assistant
- AI-generated responses and analysis results
- Conversation history and context

### Fortnox Integration Data (Optional)

If you choose to connect your Fortnox account, we access and process data from Fortnox on your behalf, including invoices, supplier invoices, salary transactions, vouchers, financial years, and company information. This connection is established via OAuth 2.0 and can be revoked at any time.

### Technical Data

- IP address, browser type, and operating system (collected automatically by our error monitoring service in the event of errors)
- Access timestamps

## How We Use Your Data

We process your personal data for the following purposes, each with a lawful basis under GDPR:

### Service Delivery (Contract Performance — Art. 6(1)(b))

- Providing and maintaining our AI platform and its features
- Processing and analyzing your uploaded documents
- Generating AI-powered insights and responses to your queries
- Managing your account and authentication
- Sending service-related notifications (password reset, conversation invites)

### Platform Stability (Legitimate Interest — Art. 6(1)(f))

- Monitoring system health and detecting errors via our error tracking service
- Preventing abuse and ensuring platform security

## AI Data Processing

Our AI features process your data to provide intelligent document analysis, financial insights, and conversational assistance. We want to be transparent about how this works:

- **Your data is not used to train AI models.** The documents you upload and the conversations you have with our AI are processed solely to provide you with the requested service. We do not use your data to train, fine-tune, or improve general-purpose AI models.
- Your documents are parsed, split into segments, and converted to vector embeddings for semantic search. These embeddings are stored in a vector database and used to provide relevant context when you query the AI assistant.
- Chat messages and document content are sent to OpenAI (our third-party AI provider) for processing. OpenAI is contractually prohibited from using your data for their own training purposes.
- AI-generated outputs (analysis results, summaries, responses) are stored as part of your conversation history and are subject to the same retention and deletion policies as other data.

## Storage & Tracking Technologies

We currently use browser local storage and similar technologies to support authentication and core platform functionality. We may use additional client-side technologies, including cookies, in the future, and will update this Privacy Policy as required.

### Browser Local Storage

We store authentication tokens (JWT) in your browser's local storage to keep you signed in. These tokens contain your user ID, role, and email, and are required for the platform to function. They are removed when you log out.

### Third-Party Resources

Our platform loads fonts from Google Fonts, which may result in your browser making requests to Google servers. Google may collect technical data (IP address, browser information) through these requests, subject to [Google's Privacy Policy](https://policies.google.com/privacy).

### Error Monitoring

Our error monitoring service (Sentry) may set its own cookies or local storage entries to track error sessions. This data is used solely for diagnosing technical issues and is not used for advertising or user profiling.

## Data Sharing & Sub-processors

We do not sell your personal data. We share data with the following categories of service providers, each bound by data processing agreements:

### Sub-processors

- **Amazon Web Services (AWS)** — EU (Stockholm, eu-north-1). Cloud infrastructure and hosting provider used for application hosting, file storage, databases, logging, content delivery, email delivery, and related technical operations.
- **OpenAI, LLC** — United States. AI model provider for chat completions and document analysis. Your chat messages and document content are sent to OpenAI for processing.
- **Functional Software, Inc. (Sentry)** — EU (Germany). Error monitoring and application performance tracking. Receives error reports with technical context.
- **Fortnox AB** — Sweden. Accounting software integration (only when you explicitly connect your Fortnox account via OAuth).

### Legal Obligations

We may disclose your data when required by law, regulation, or legal process, or to protect the rights, safety, or property of Lucra AI, our users, or others.

### Business Transfers

In the event of a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction. We will notify you of any such change and ensure your data remains protected under equivalent terms.

## Data Retention

We retain your personal data only for as long as necessary to fulfill the purposes described in this policy:

- **Account data** is retained for the duration of your active account. Upon account deletion, your profile data, authentication tokens, and Fortnox connections are permanently removed.
- **Uploaded documents** are retained while your account is active. You can delete individual files at any time through the platform, which removes both the file from storage and its vector embeddings. Upon account deletion, your uploaded documents and associated vector embeddings are permanently removed, subject to any legal retention obligations.
- **Conversation history** is retained while your account is active. Upon account deletion, the content of your chat messages is removed from the platform.
- **Legal and financial records** related to Lucra AI's own business operations (such as billing records, if applicable) may be retained for up to 7 years as required by Swedish accounting law (Bokföringslagen 1999:1078).

## International Transfers

LucrAI Tech AB is based in Sweden within the EU/EEA. Your data is primarily stored and processed within the EU/EEA region (AWS eu-north-1, Stockholm).

However, certain data is transferred to the United States for processing by OpenAI (our AI model provider). For these transfers, we rely on the following safeguards:

- The EU-U.S. Data Privacy Framework, where the recipient is certified
- Standard Contractual Clauses (SCCs) approved by the European Commission
- Additional technical and organizational measures to protect your data during transfer

## Data Security

We implement appropriate technical and organizational measures to protect your personal data, including:

- Passwords are stored in hashed form using industry-standard security practices and are never stored in plaintext
- All data in transit is encrypted using TLS
- Files are stored in AWS S3 with server-side encryption
- Authentication uses short-lived JWT access tokens with separate refresh tokens
- Role-based access control restricts data access based on user roles
- File metadata, including SHA-256 checksums, is used to help detect duplicate uploads and support file management

## Data Breach Notification

In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will:

- Notify the Swedish Authority for Privacy Protection (Integritetsskyddsmyndigheten, IMY) within 72 hours of becoming aware of the breach, as required by GDPR Article 33
- Notify affected users without undue delay if the breach is likely to result in a high risk to their rights and freedoms, as required by GDPR Article 34
- Document the breach, its effects, and the remedial actions taken

## Your Rights

Under the General Data Protection Regulation, you have the following rights regarding your personal data:

- **Right of Access (Art. 15)** — You can request a copy of the personal data we hold about you.
- **Right to Rectification (Art. 16)** — You can ask us to correct inaccurate or incomplete personal data.
- **Right to Erasure (Art. 17)** — You can request the deletion of your personal data, subject to legal retention requirements.
- **Right to Restriction (Art. 18)** — You can ask us to restrict the processing of your data in certain circumstances.
- **Right to Data Portability (Art. 20)** — You can receive your personal data in a structured, commonly used, machine-readable format.
- **Right to Object (Art. 21)** — You can object to processing based on legitimate interests.

To exercise any of these rights, please contact us at [privacy@lucra.ai](mailto:privacy@lucra.ai). We will respond to your request within 30 days.

If you believe that your data protection rights have been violated, you have the right to lodge a complaint with the Swedish Authority for Privacy Protection (Integritetsskyddsmyndigheten, IMY) at [www.imy.se](https://www.imy.se).

## Children's Privacy

Lucra AI is a B2B platform not intended for use by individuals under the age of 18. We do not knowingly collect personal data from children. If we become aware that we have collected personal data from a child under 18, we will take steps to delete that data promptly.

## Changes & Contact

We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or platform features. When we make material changes, we will notify you through the platform or by email at least 14 days before the changes take effect.

### Contact Us

If you have questions about this Privacy Policy or wish to exercise your data protection rights, please contact us:

- Email: [privacy@lucra.ai](mailto:privacy@lucra.ai)
- Company: LucrAI Tech AB
- Location: Sweden, EU
