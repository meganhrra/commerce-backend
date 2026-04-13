const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: parseInt(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Use the authenticated Gmail account as sender to avoid rejection
const FROM_ADDRESS = process.env.SMTP_USER;

async function sendPasswordRecovery(toEmail, resetToken) {
  const resetUrl = `${process.env.APP_URL}/restablecer?token=${resetToken}`;

  await transporter.sendMail({
    from: `"G8 Tech" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: 'Recuperación de contraseña — G8 Tech',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 20px;">Recuperación de contraseña</h2>
          <p style="color: #64748b; margin: 0 0 24px 0; font-size: 14px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p style="color: #475569; font-size: 14px; margin: 0 0 24px 0;">Haz clic en el siguiente enlace para crear una nueva contraseña. El enlace expira en <strong>1 hora</strong>.</p>
          <p style="margin: 0 0 32px 0;">
            <a href="${resetUrl}"
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 14px;">
              Restablecer contraseña
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 16px 0;" />
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px 0;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <p style="color: #cbd5e1; font-size: 12px; margin: 0;">O copia y pega este enlace en tu navegador:<br><span style="color: #94a3b8;">${resetUrl}</span></p>
        </div>
      </div>
    `
  });
}

async function testConnection() {
  await transporter.verify();
}

module.exports = { sendPasswordRecovery, testConnection };
