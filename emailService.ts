import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { 
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email 
  };
}

async function getResendClient() {
  const { apiKey } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: connectionSettings.settings.from_email
  };
}

export class EmailService {
  async sendApplicationConfirmation(
    toEmail: string, 
    jobTitle: string, 
    company: string, 
    source: string
  ) {
    try {
      const { client, fromEmail } = await getResendClient();
      
      await client.emails.send({
        from: fromEmail || 'QuotaFlow <noreply@quotaflow.com>',
        to: toEmail,
        subject: `Applied: ${jobTitle} at ${company}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Application Submitted</h2>
            <p>QuotaFlow has applied to the following job on your behalf:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">${jobTitle}</h3>
              <p style="margin: 0; color: #6b7280;">${company}</p>
              <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 14px;">Source: ${source}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              View all your applications in the QuotaFlow dashboard.
            </p>
          </div>
        `,
      });
      
      console.log(`[Email] Sent confirmation for ${jobTitle} to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('[Email] Failed to send:', error);
      return false;
    }
  }

  async sendDailySummary(toEmail: string, applicationsCount: number, jobsList: string[]) {
    try {
      const { client, fromEmail } = await getResendClient();
      
      const jobsHtml = jobsList.map(job => `<li>${job}</li>`).join('');
      
      await client.emails.send({
        from: fromEmail || 'QuotaFlow <noreply@quotaflow.com>',
        to: toEmail,
        subject: `Daily Summary: ${applicationsCount} applications submitted`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Your Daily Job Search Summary</h2>
            <p>QuotaFlow applied to <strong>${applicationsCount} jobs</strong> today:</p>
            <ul style="background: #f3f4f6; padding: 20px 20px 20px 40px; border-radius: 8px;">
              ${jobsHtml}
            </ul>
            <p style="color: #6b7280;">
              Keep up the great work! You're getting closer to meeting your quota.
            </p>
          </div>
        `,
      });
      
      console.log(`[Email] Sent daily summary to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('[Email] Failed to send daily summary:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
