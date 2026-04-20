const nodemailer = require('nodemailer');

async function sendReminder(to, eventTitle, eventDate) {
  // Test account generation (Ethereal Email)
  // This is used for autonomous testing without providing real SMTP credentials
  let testAccount = await nodemailer.createTestAccount();

  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  let info = await transporter.sendMail({
    from: '"Agenda UVV" <no-reply@uvv.br>',
    to: to,
    subject: `Lembrete: ${eventTitle}`,
    text: `Olá! Um lembrete para o seu compromisso: ${eventTitle} dia ${new Date(eventDate).toLocaleString('pt-BR')}`,
    html: `<b>Olá!</b><br>Um lembrete para o seu compromisso: <b>${eventTitle}</b> dia ${new Date(eventDate).toLocaleString('pt-BR')}`,
  });

  console.log("Mensagem enviada: %s", info.messageId);
  console.log("URL de preview do e-mail: %s", nodemailer.getTestMessageUrl(info));
  return info;
}

module.exports = { sendReminder };
