const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const cron = require("node-cron");
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Subscriber = require('./models/subsModel');
const recipesRouter = require('./routes/recipeRoutes');
const usersRouter = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: ['http://localhost:3000','https://recipe-blogging-website-frontend.vercel.app'] }));
app.use(fileUpload());
app.use('/uploads', express.static(__dirname + '/uploads'));

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/recipes', recipesRouter);
app.use('/api/users', usersRouter);

app.use(notFound);
app.use(errorHandler);


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);


oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// const getAuthUrl = () => {
//   const scopes = ['https://mail.google.com/'];
//   return oauth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: scopes,
//   });
// };

const sendEmail = async (emailOptions) => {
  try {
    const accessToken = await oauth2Client.getAccessToken();
    const transporter = nodemailer.createTransport({ 
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailOptions.to,
      subject: emailOptions.subject,
      text: emailOptions.text,
      html: emailOptions.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

cron.schedule('25 11 * * 6', async () => {
  try {
    const subscribers = await Subscriber.find({});
    subscribers.forEach(async (subscriber) => {
      const emailOptions = {
        to: subscriber.email,
        subject: 'Weekly Recipe Notification',
        text: 'Do not have an idea how to make a specific item? Have a look into the site where you can find lots of people sharing their recipes.',
        html: '<h1>Reminder!!!</h1><br><p>Check out this amazing recipe website FAR... click on the link below</p><br>',
      };
      await sendEmail(emailOptions);
    });
  } catch (error) {
    console.error('Error sending emails:', error);
  }
});

connectDB().then(() => {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});
 