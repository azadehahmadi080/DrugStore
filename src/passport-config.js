
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const { Pool } = require('pg');

// Setting  Connect to  Database 
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'userdb',
  password: 'postgres',
  port: 5432,
});

// Function  for  get  user based Email
const getUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0]; 
};

// Function For  get  userId   
const getUserById = async (id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0]; 
};

function initialize(passport) {
  const authenticateUsers = async (email, password, done) => {
    const user = await getUserByEmail(email);
    if (user == null) {
      console.log("User Not Found!");
      return done(null, false, { message: "No user found with that email" });
    }
    try {
      if (await bcrypt.compare(password, user.password)) {
        return done(null, user);
      } else {
        console.log("Password Is Incorrect");
        return done(null, false, { message: "Password Incorrect" });
      }
    } catch (e) {
      console.log(e);
      return done(e);
    }
  };

  passport.use(
    new LocalStrategy({ usernameField: "email" }, authenticateUsers)
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await getUserById(id);
    return done(null, user);
  });
}

module.exports = initialize;

