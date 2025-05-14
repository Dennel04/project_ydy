const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const bcrypt = require('bcryptjs');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Стратегия Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Проверяем, существует ли уже пользователь с таким Google ID
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Если пользователь существует, обновляем данные, если нужно
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }
        
        // Если пользователя нет, создаем нового
        // Генерируем случайный пароль для совместимости с обычной авторизацией
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        // Создаем нового пользователя
        const newUser = new User({
          googleId: profile.id,
          login: `google_${profile.id}`, // Уникальный логин
          email: profile.emails[0].value,
          username: profile.displayName || profile.emails[0].value.split('@')[0],
          password: hashedPassword,
          isEmailVerified: true // Email уже подтвержден Google
        });
        
        await newUser.save();
        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport; 