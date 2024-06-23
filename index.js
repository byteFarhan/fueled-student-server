const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SEC_KEY);

const port = process.env.PORT || 5000;

// Middleware ==============
const options = {
  origin: [
    "http://localhost:5173",
    "https://dine-ease-a12.web.app",
    "https://dine-ease-a12.firebaseapp.com",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

app.use(cors(options));
app.use(express.json());
app.use(cookieParser());

// Veryfy token
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log('verifyTokennn:', token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  jwt.verify(token, process.env.TOKEN_SEC, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    req.user = decoded;
    next();
  });
  // next();
};

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l14kn2a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // All DB Cullection
    const mealsCollection = client.db("fueled_student_DB").collection("meals");
    // Create an index on the 'title' field
    // await mealsCollection.createIndex({ title: 1 });
    // console.log('Index created on title field');

    const userCollection = client.db("fueled_student_DB").collection("users");
    // await userCollection.createIndex({ userEmail: 1, userName: 1 });

    const likeCollection = client.db("fueled_student_DB").collection("likes");

    const paymentCollection = client
      .db("fueled_student_DB")
      .collection("payments");
    const upcomingCollection = client
      .db("fueled_student_DB")
      .collection("upcoming_meals");
    // Create an index on the 'title' field
    // await mealsCollection.createIndex({ title: 1 });

    const mealsRequestCollection = client
      .db("fueled_student_DB")
      .collection("meals-request");
    // await mealsRequestCollection.createIndex({ recEmail: 1, recName: 1 });

    const reviewCollection = client
      .db("fueled_student_DB")
      .collection("reviews");

    // Auth related API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SEC, {
        expiresIn: "1d",
      });
      // console.log('token:', token);
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // Cookies remove
    app.post("/logout", verifyToken, async (req, res) => {
      const user = req.body;
      console.log("Remove token");
      return res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    //users related action start ======================================================
    // Services related API

    // User part============

    // New user post-
    app.post("/new-user", async (req, res) => {
      const user = req.body;
      // console.log(user);
      // return;
      const query = { userEmail: user.userEmail };
      const existUser = await userCollection.findOne(query);
      if (existUser) {
        return res.send({ message: "User Allready Exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // All user read
    app.get("/total-users", verifyToken, async (req, res) => {
      const result = await userCollection.estimatedDocumentCount();
      res.send({ count: result });
    });
    app.get("/users", verifyToken, async (req, res) => {
      const search = req.query.search;
      const filter = req.query.filter;
      const perpage = parseInt(req.query.perpage);
      const currentpage = parseInt(req.query.currentpage);
      const skip = perpage * currentpage;

      let result;
      let doc;
      if (
        filter === "Silver" ||
        filter === "Gold" ||
        filter === "Platinum" ||
        filter === "Bronze"
      ) {
        doc = {
          badge: filter,
        };
      }

      if (search) {
        const query = {
          $or: [
            { userName: { $regex: search, $options: "i" } },
            { userEmail: { $regex: search, $options: "i" } },
          ],
        };
        result = await userCollection.find(query).toArray();
      } else if (doc) {
        result = await userCollection.find(doc).toArray();
      } else {
        result = await userCollection
          .find()
          .limit(perpage)
          .skip(skip)
          .toArray();
      }
      res.send(result);
    });

    // Check Admin
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      if (email !== req.user.email) {
        return req.status(403).send({ message: "Unauthorized access" });
      }
      // console.log('emailll', req.user.email);
      const query = { userEmail: email, role: "admin" };
      const result = await userCollection.findOne(query);
      let admin = false;
      if (result?.role === "admin") {
        admin = true;
      }
      // console.log(admin);

      res.send({ admin });
    });
    // User badge change --
    app.patch("/change-user-badge", verifyToken, async (req, res) => {
      const badge = req.query.badge;
      const email = req.query.email;
      // console.log('empolye:', role, '===id:', id);
      const query = { email: email };
      const update = {
        $set: {
          role: badge,
        },
      };
      const options = { upsert: true };
      const result = await userCollection.updateOne(query, update, options);
      res.send(result);
    });

    // User role change --
    app.patch("/change-user-role", verifyToken, async (req, res) => {
      const role = req.query.role;
      const id = req.query.id;
      // console.log('empolye:', role, '===id:', id);
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          role: role,
        },
      };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });

    // Payment part token passing =======
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const { price } = req.body;
      const pricee = parseInt(price * 100);
      // console.log(pricee);
      // return;
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: pricee,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //  Payment Saved
    app.post("/payments", verifyToken, async (req, res) => {
      const data = req.body;
      // const query = { email: data.email, badge: badge };
      const query2 = { userEmail: data.email };
      const badge = data.badge;
      const update = {
        $set: {
          badge: badge,
        },
      };
      const options = { upsert: true };
      const user_update = await userCollection.updateOne(
        query2,
        update,
        options
      );

      // const existUser = await paymentCollection.findOne(query);
      // if (existUser) {
      //   return res.send({ message: 'User Allready Exists', insertedId: null });
      // }
      const result = await paymentCollection.insertOne(data);

      res.send({ result, user_update });
    });
    //  Payment History read
    app.get("/all-payments", verifyToken, async (req, res) => {
      const result = await paymentCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });
    app.get("/paymentss/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      const result = await paymentCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });
    app.get("/paymentssCnf/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await paymentCollection.findOne(query);
      let final = false;
      if (result) {
        final = true;
      }
      res.send(final);
    });

    //Meals related api's
    app.get("/meals-six", async (req, res) => {
      const result = await mealsCollection
        .find()
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });
    app.get("/breakfast", async (req, res) => {
      const query = { category: "Breakfast" };
      const result = await mealsCollection
        .find(query)
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });
    app.get("/lunch", async (req, res) => {
      const query = { category: "Lunch" };
      const result = await mealsCollection
        .find(query)
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });
    app.get("/dinner", async (req, res) => {
      const query = { category: "Dinner" };
      const result = await mealsCollection
        .find(query)
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
