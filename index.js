const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const port = process.env.PORT || 3000;
require('dotenv').config()

// middleware
app.use(cors());
app.use(express.json());

const uri =
 `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@smartdeals.wzjrdtw.mongodb.net/?appName=smartDeals`;
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
    await client.connect();

    const db = client.db("exportImportdb");
    const productsCollection = db.collection("products");
    const importedCollection = db.collection("imported");

    app.get("/", (req, res) => {
      res.send("it's running well");
    });

    // get all product
    app.get("/products", async (req, res) => {
      const cursor = productsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //get single product
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    //get 6 most recent product
    app.get("/recent-products", async (req, res) => {
      const result = await productsCollection
        .find()
        .sort({ created_at: "desc" })
        .limit(6)
        .toArray();
      res.send(result);
    });

    //get my exports with email:
    app.get("/my-exports", async (req, res) => {
      const email = req.query.email;
      const result = await productsCollection.find({ email: email }).toArray();
      res.send(result);
    });

    // product add kora 
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    // upadate product 
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updateproduct = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updateproduct.name,
          price: updateproduct.price,
        },
      };
      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });

    // product ke update kora put diye
    app.put("/product/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      const update = {
        $set: data,
      };
      const result = await productsCollection.updateOne(filter, update);
      res.send({
        success: true,
      });
    });

    // delete korbe ekta full product ke
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // showing imported products
    app.post("/imported", async (req, res) => {
      const data = req.body;
      delete data._id;
      const result = await importedCollection.insertOne(data);
      res.send(result);
    });

    //get my imports with email:
    app.get("/my-imported", async (req, res) => {
      const email = req.query.email;
      const result = await importedCollection
        .find({ imported_by: email })
        .toArray();
      res.send(result);
    });

    // delete korbe ekta full product ke
    app.delete("/imported/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await importedCollection.deleteOne(query);
      res.send(result);
    });

    // Decrease available_quantity safely
    app.patch("/products/:id/decrement", async (req, res) => {
      const id = req.params.id;
      const { decrement } = req.body;

      if (!decrement || decrement <= 0) {
        return res
          .status(400)
          .send({ success: false, message: "Invalid decrement value" });
      }

      try {
        const filter = {
          _id: new ObjectId(id),
          available_quantity: { $gte: decrement },
        };
        const update = { $inc: { available_quantity: -decrement } };

        const result = await productsCollection.updateOne(filter, update);

        if (result.modifiedCount === 0) {
          return res
            .status(400)
            .send({ success: false, message: "Not enough quantity available" });
        }

        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    // Increase imported_quantity
    app.patch("/products/:id/increment-imported", async (req, res) => {
      const { increment } = req.body; // number to increment, default 1
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = { $inc: { imported_quantity: increment || 1 } };

      const result = await productsCollection.updateOne(filter, update);
      res.send({ success: true, result });
    });

    // search
    app.get("/search", async (req, res) => {
      const search_text = req.query.search;
      const result = await productsCollection
        .find({ product_name: { $regex: search_text, $options: "i" } })
        .toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Our server is running on port : ${port}`);
});
