const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4dm99p5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const testCollection = client.db("testsDb").collection("users");
    const recCollection = client.db("testsDb").collection("recommendations");
    const allTestCollection = client.db("testsDb").collection("allTest");
    const bookingsCollection = client.db("testsDb").collection("bookings");
    const bannerCollection = client.db("testsDb").collection("banners");


    // Recommendations findings
    app.get('/recommendations', async (req, res) => {
      const result = await recCollection.find().toArray();
      res.send(result);
    });

    // AllTest findings
    app.get('/allTest', async (req, res) => {
      const result = await allTestCollection.find().toArray();
      res.send(result);
    });

   
    // all bookings findings
    app.get('/allBookings', async (req, res) => {
      const result = await bookingsCollection.find().toArray();
      res.send(result);
    });


    // all banners getting
    app.get('/allBanners', async (req, res) => {
      const banners = await bannerCollection.find().toArray();
      res.send(banners);
  });
  
  // getting the active banner
  app.get('/activeBanner', async (req, res) => {
    const activeBanner = await bannerCollection.findOne({ isActive: true });
    res.send(activeBanner);
});




    // Single test details
    app.get('/allTest/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const test = await allTestCollection.findOne(query);
      if (test) {
        res.send(test);
      } else {
        res.status(404).send({ message: 'Test not found' });
      }
    });
 

   // Get single test details
   app.get('/allTest/:id', async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid ID" });
    }
    try {
      const test = await allTestCollection.findOne({ _id: new ObjectId(id) });
      if (test) {
        res.send(test);
      } else {
        res.status(404).send({ message: 'Test not found' });
      }
    } catch (error) {
      res.status(500).send({ message: "Error fetching test", error });
    }
  });
  
  
  //admin test Update
  app.get('/updateAdminTest/:id' , async(req,res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await allTestCollection.findOne(query);
    res.send(result)
  } )  


  // user bookings
  app.get('/bookings/:email', async (req, res) => {
    const email = req.params.email;
    const query = { email: email }; 
    try {
        const result = await bookingsCollection.find(query).toArray();
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Error fetching bookings", error });
    }
});

 
  // adminUpdateTest 

  app.patch('/updateAdminTest/:id', async(req,res)=> {
    const test = req.body 
    const id= req.params.id 
    const filter = {_id : new ObjectId(id)}
    const updatedDoc = {
      $set : {
        name : test.name ,
        image : test.image ,
        price : test.price ,
        slots : test.slots ,
        details : test.details ,
        startDate : test.startDate ,
        endDate : test.endDate        
      }
    }
    const result = await allTestCollection.updateOne(filter , updatedDoc)
    res.send(result)
  })

    // Adding users
    app.post('/allTest', async (req, res) => {
      const allTests = req.body;
      const result = await allTestCollection.insertOne(allTests);
      res.send(result);
    });

    // Adding the test data
    app.post('/users', async (req, res) => {
      const userInfo = req.body;
      const result = await testCollection.insertOne(userInfo);
      res.send(result);
    });

    // Adding a test collection
    app.post('/userTest', async (req, res) => {
      const paymentInfo = req.body;
      // console.log(req.body);
      const result = await bookingsCollection.insertOne(paymentInfo);
      res.send(result);
    });
 

    // adding the banners
     
    app.post('/addBanner', async (req, res) => {
      const bannerData = req.body;
      const result = await bannerCollection.insertOne(bannerData);
      res.send(result);
  }); 

  // Update a test
  app.put('/allTest/:id', async (req, res) => {
    const id = req.params.id;
    const updateData = req.body;

    console.log("Received ID:", id);
    console.log("Update Data:", updateData);

    // Check if the ID is valid
    if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid ObjectId" });
    }

    try {
        const result = await allTestCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        console.log("Update Result:", result);

        if (result.matchedCount === 1) {
            res.send({ message: 'Test updated successfully', result });
        } else {
            res.status(404).send({ message: 'Test not found' });
        }
    } catch (error) {
        console.error("Error updating test:", error);
        res.status(500).send({ message: "Failed to update test", error });
    }
  });


   

  // update banner
  app.patch('/updateBannerStatus/:id', async (req, res) => {
    const id = req.params.id;
    const updateResult = await bannerCollection.updateMany({}, { $set: { isActive: false } });
    const result = await bannerCollection.updateOne({ _id: new ObjectId(id) }, { $set: { isActive: true } });
    res.send(result);
});
 
  
  // Update user profile
app.put('/users/:uid', async (req, res) => {
  const uid = req.params.uid; 
  const updatedProfile = req.body; 

  try {
      const query = { uid: uid };
      const updateDoc = {
          $set: updatedProfile
      };

      const result = await bookingsCollection.updateOne(query, updateDoc);

      if (result.matchedCount === 0) {
          res.status(404).send({ message: 'User not found' });
          return;
      }

      res.send({ message: 'Profile updated successfully', result });
  } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).send({ message: "Failed to update profile", error });
  }
});


  // Delete a test
  app.delete('/allTest/:id', async (req, res) => {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid ID" });
    }

    try {
      const result = await allTestCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 1) {
        res.send({ message: 'Test deleted successfully' });
      } else {
        res.status(404).send({ message: 'Test not found' });
      }
    } catch (error) {
      res.status(500).send({ message: "Failed to delete test", error });
    }
  });



// delete banner
app.delete('/deleteBanner/:id', async (req, res) => {
  const id = req.params.id;
  const result = await bannerCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

  // deleting appointment 
  app.delete('/bookings/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    try {
        const result = await bookingsCollection.deleteOne(query);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Error deleting booking", error });
    }
});



    // Payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const priceInCent = parseFloat(price) * 100;

      if (!price || priceInCent < 1) {
        return res.status(400).send({ error: 'Invalid price' });
      }

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: priceInCent,
          currency: 'usd',
          automatic_payment_methods: {
            enabled: true,
          },
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("labX is running");
});

app.listen(port, () => {
  console.log(`labX is running on the port ${port}`);
});
