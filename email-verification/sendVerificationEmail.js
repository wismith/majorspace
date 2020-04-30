'use strict';
require('dotenv').config();
const mailgun = require('mailgun-js');

function sendVerificationEmail(email, token) {
  const mg = new mailgun({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN
  });

  let link = `https://majorspace.net/user/verify?token=${token}`;
  const data = {
    from: 'Major Space <verify@majorspace.net>',
    to: email,
    subject: 'Verify your Major Space account',
    html: `
    <head>
      <style>
        html {
          text-align: center;
        }
        a {
          padding: 2%;
          border-radius: 5%;
          background-color: blue;
          color: white;
          margin: 10px;
        }
      </style>
    </head>
    <h1>Thank you for creating a Major Space Account!</h1>
    <h4>You just need to verify your account by clicking the link below, then you're good to go!</h4>
    <br><br>
    <a href="${link}">${link}</a>
    <br><br>
    <h4>- Team Major Space</h4>
    `
  };

  mg.messages().send(data, function(error, body) {
    console.log(body);
  });
}

module.exports = sendVerificationEmail;