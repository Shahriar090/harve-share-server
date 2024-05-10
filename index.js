const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    // db collections
    const db = client.db("harve-share");
    const collection = db.collection("users");
    const suppliesCollection = db.collection("supplies");
    const postCollection = db.collection("posts");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    // ==============================================================
    // WRITE YOUR CODE HERE
    // ==============================================================

    // ..........................................................

    // all supplies route
    app.get("/api/v1/supplies", async (req, res) => {
      const cursor = suppliesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // single supply based on id

    app.get("/api/v1/supplies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await suppliesCollection.findOne(query);
        if (!result) {
          return res.status(404).json({ message: "Supply not found" });
        }
        res.json(result);
      } catch (error) {
        console.error("Error fetching supply:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // post api

    app.post("/api/v1/posts", async (req, res) => {
      try {
        const newPost = req.body;
        const result = await postCollection.insertOne(newPost);
        res.json({
          success: true,
          message: "Post added successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error adding post:", error);
        res.status(500).json({
          success: false,
          message: "Failed to add post",
          error: error.message,
        });
      }
    });

    // get all posts
    app.get("/api/v1/posts", async (req, res) => {
      try {
        const cursor = postCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // update post

    app.put("/api/v1/posts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedPost = req.body;
      const post = {
        $set: {
          image: updatedPost.image,
          category: updatedPost.category,
          title: updatedPost.title,
          quantity: updatedPost.quantity,
          description: updatedPost.description,
        },
      };
      const result = await postCollection.updateOne(filter, options, post);
      res.send(result);
    });

    // delete post

    app.delete("/api/v1/posts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postCollection.deleteOne(query);
      res.send(result);
    });

    // ........................................................

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
