const nodemailer = require('nodemailer');

async function sendReminder(to, eventTitle, eventDate, avisoPrefixo = "Aviso") {
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
    subject: `[${avisoPrefixo}] Agenda UVV: ${eventTitle}`,
    text: `Olá! ${avisoPrefixo} - Compromisso: ${eventTitle} dia ${new Date(eventDate).toLocaleString('pt-BR')}`,
    html: `<b>Olá!</b><br>${avisoPrefixo} do compromisso: <b>${eventTitle}</b> dia ${new Date(eventDate).toLocaleString('pt-BR')}`,
  });

  console.log("Mensagem enviada: %s", info.messageId);
  console.log("URL de preview do e-mail: %s", nodemailer.getTestMessageUrl(info));
  return info;
}

module.exports = { sendReminder };
