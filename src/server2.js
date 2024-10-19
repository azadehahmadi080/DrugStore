if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
  }
  
  //Importing Libraries;
  const express = require("express"); 
  const path = require('path');
  const app = express();

  // Serve static files from the "image" directory
app.use('/image', express.static(path.join(__dirname, 'image')));
  const bcrypt = require("bcrypt");
  const passport = require("passport");
  const initializePassport = require("./passport-config");
  const flash = require("express-flash");
  const session = require("express-session");
  const { Pool } = require('pg');
  const nodemailer = require("nodemailer");



  // Connecting Settings to database
// const pool = new Pool({
//     user: 'postgres', // Username of the database
//     host: 'localhost',
//     database: 'userdb', // Name of database
//     password: 'postgres', // Password
//     port: 5432, //  PostgreSQL Port
// });

// Debugging: Log environment variables
console.log("Environment Variables Loaded:");
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_PORT:", process.env.DB_PORT);



// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: parseInt(process.env.DB_PORT) || 5432,
// });




// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: parseInt(process.env.DB_PORT) || 5432,
//   ssl: {
//     rejectUnauthorized: false, // Set to true in production if you have valid certificates
//   },
// });


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 5432,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Set to true in production if you have valid certificates
  } : false, // Disable SSL for local development
});


// Middleware
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 
app.use(express.static("public"));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_key',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());




app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  next();
});



 
  initializePassport(
    passport,
    (email) => users.find((user) => user.email === email),
    (id) => users.find((user) => user.id === id)
  );
  
  const users = [];
 
  

  app.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/home",
      failureRedirect: "/login",
      failureFlash: true,
    }),
    (req, res) => {
      console.log("user successfully enter  :", req.user);
    }
  );

  app.post("/signup", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const name = req.body.name;
        const email = req.body.email;

        // Storage of information in the database
        await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
            [name, email, hashedPassword]
        );

        res.redirect("/login");
    } catch (e) {
        console.log(e);
        res.redirect("/signup");
    }
});


// Route for logout
app.post('/logout', (req, res) => {
  req.logout((err) => {
      if (err) {
          console.error(err);
          return res.redirect('/'); 
      }
      req.flash('success_msg', 'You have been logged out'); 
      res.redirect('/'); 
  });
});


  //Routes
  app.get("/", (req, res) => {
    res.render("login.ejs");
  });
app.get("/home", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  try {
      const result = await pool.query('SELECT * FROM medicines2');
      const medicines2 = result.rows;
      res.render("home.ejs", { medicines2, userId: req.user.id }); // Send userId to view
  } catch (error) {
      console.error(error);
      res.status(500).send("Error loading data");
  }
});




app.get("/product/:id2", async (req, res) => {
  const id = req.params.id2;
  try {
      const result = await pool.query('SELECT * FROM medicines2 WHERE id = $1', [id]);
      const medicine = result.rows[0]; 
      if (!medicine) {
          return res.status(404).send("The drug was not found  ");
      }
      res.render("sproduct2home.ejs", { medicine }); // Send drug information to view
  } catch (error) {
      console.error(error);
      res.status(500).send("خطا در بارگذاری داده‌ها");
  }
});




app.get("/product/:id", async (req, res) => {
  const id = req.params.id;
  try {
      const result = await pool.query('SELECT * FROM medicines WHERE id = $1', [id]);
      const medicine = result.rows[0]; 
      if (!medicine) {
          return res.status(404).send("The drug was not found  ");
      }
      res.render("sproduct2.ejs", { medicine }); // Send drug information to view
  } catch (error) {
      console.error(error);
      res.status(500).send("خطا در بارگذاری داده‌ها");
  }
});



app.post('/cart/add', async (req, res) => {
  if (!req.isAuthenticated()) {
      return res.status(403).send('Unauthorized');
  }

  const userId = req.user.id; 
  const { id, image, name, price, quantity } = req.body;
  const total = price * quantity;

  try {
      const existingItem = await pool.query(
          'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
          [userId, id]
      );

      if (existingItem.rows.length > 0) {
          // If there is a product, update the amount
          await pool.query(
              'UPDATE cart_items SET quantity = quantity + $1, total = total + $2 WHERE user_id = $3 AND product_id = $4',
              [quantity, total, userId, id]
          );
      } else {
          // If there is no productT add it
          await pool.query(
              'INSERT INTO cart_items (user_id, product_id, image, name, price, quantity, total) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [userId, id, image, name, price, quantity, total]
          );
      }

      res.status(200).send('Product added to cart');
  } catch (error) {
      console.error('Error in adding product:', error);
      res.status(500).send('Error in adding product');
  }
});
app.post('/cart/remove', async (req, res) => {
  if (!req.isAuthenticated()) {
      return res.status(403).send('Unauthorized');
  }

  const userId = req.user.id; 
  const { productId } = req.body;

  try {
      await pool.query(
          'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
          [userId, productId]
      );
      res.status(200).send('Product removed from cart');
  } catch (error) {
      console.error('Error in product removal:', error);
      res.status(500).send('Error in product removal');
  }
});

app.get("/cart", async (req, res) => {
  if (!req.isAuthenticated()) {
      return res.redirect('/login');
  }

  const userId = req.user.id;

  try {
      const result = await pool.query(
          'SELECT * FROM cart_items WHERE user_id = $1',
          [userId]
      );

      const cartItems = result.rows; 
      res.render("cart.ejs", { cartItems, userId });
  } catch (error) {
      console.error('Error in loading cart :', error);
      res.status(500).send('Error in loading cart');
  }
});

app.get("/doctors", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM doctors');
    const doctors = result.rows;
    res.render("doctors.ejs", { doctors, userId: req.user.id }); 
} catch (error) {
    console.error(error);
    res.status(500).send("Error loading data");
}
  });

  app.get("/shop", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM medicines');
        const medicines = result.rows;
        res.render("shop.ejs", { medicines, userId: req.user.id }); 
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading data");
    }
  });

 // Route for contact form
app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});

// Route for send contact form
app.post('/contact', async (req, res) => {
  const { first_name, last_name, yahoo, message } = req.body;

  const transporter = nodemailer.createTransport({
      // service: 'Yahoo', 

      host: 'smtp.mail.yahoo.com', // استفاده از SMTP Yahoo
      port: 465, // پورت برای SSL
      secure: true, // true برای استفاده از SSL
      auth: {
          user: process.env.EMAIL, 
          pass: process.env.EMAIL_PASSWORD 
      }
  });

  const mailOptions = {
      from: yahoo,
      to: process.env.EMAIL, 
      subject: `New contact form submission from ${first_name} ${last_name}`,
      text: `You have received a new message:\n\nName: ${first_name} ${last_name}\nEmail: ${yahoo}\nMessage: ${message}`
  };

  try {
      await transporter.sendMail(mailOptions);
      req.flash('success_msg', 'Your message has been sent successfully!');
      res.redirect('/contact');
  } catch (error) {
      console.error('Error sending email:', error);
      req.flash('error_msg', 'There was an error sending your message. Please try again later.');
      res.redirect('/contact');
  }
});

  app.get("/login", (req, res) => {
    res.render("login.ejs");
  });
  app.get("/signup", (req, res) => {
    res.render("signup.ejs");
  });
  const port = 5000;

app.listen(port, () => {
    console.log(`Server running on Port: ${port}`);
});

  