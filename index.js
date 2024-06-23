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
    app.get("/users", async (req, res) => {
      let query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      const query = { email: userInfo.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      } else {
        const result = await usersCollection.insertOne(userInfo);
        return res.send(result);
      }
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
