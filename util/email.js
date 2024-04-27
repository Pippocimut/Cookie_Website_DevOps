const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport');
const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: process.env.SENDGRID_API_KEY
  }
}));

const defaultEmail = "teokappa02@gmail.com"

exports.sendEmail = (email, subject, message) => {
    transporter.sendMail({
        to: email,
        from: defaultEmail,
        subject: subject,
        html: message
    })
}