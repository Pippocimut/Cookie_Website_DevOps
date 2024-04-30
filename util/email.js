const nodemailer = require('nodemailer')
const path = require('path')
const sendgridTransport = require('nodemailer-sendgrid-transport');
const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: process.env.SENDGRID_API_KEY
  }
}));

const emailsPath = path.join(__dirname, '..', 'pages', 'email');
const defaultEmail = "teokappa02@gmail.com"

exports.sendEmail = (email, subject, message) => {
    transporter.sendMail({
        to: email,
        from: defaultEmail,
        subject: subject,
        html: message
    })
}