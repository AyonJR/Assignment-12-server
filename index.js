const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();

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
    const usersCollection = client.db("testsDb").collection("user");

  
  // jwt related api 

   app.post('/jwt' , async(req,res)=>{
    const user = req.body ;
    const token = jwt.sign(user , process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '1h'})
      res.send({token})
    
   })

  // middle wares 

  const verifyToken = (req,res,next) => {
    console.log('inside verify token', req.headers.authorization)
    if(!req.headers.authorization){
      return res.status(401).send({message : 'unauthorized access'})
    }
    const token = req.headers.authorization.split(' ')[1] ; 
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, decoded)=>{
      if(err){
        return res.status(401).send({message:"unauthorized access"})
      }
      req.decoded = decoded ;
      next()
    } )
  }

  
  const verifyAdmin = async(req, res , next)=> {
    const email = req.decoded.email ;
    const query = {email : email}
    const user = await usersCollection.findOne(query)
    const isAdmin = user?.role === 'admin' ;
    if(!isAdmin ){
      return res.status(403).send({message : 'forbidden access'})
    }
    next()
  }


    // user related apis
   
    app.post('/loginUsers' , async(req,res) => {
      const user = req.body 
    
      // insert email if user doesnt exits
      const query = {email : user.email}
      const existingUser = await usersCollection.findOne(query)
      if(existingUser){
        return res.send({message : 'user already exists', insertedId : null})
      }

      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

 
  // checking admin 
  app.get('/loginUsers/admin/:email' , verifyToken , async (req,res)=>{
    const email = req.params.email ;
    if(email !== req.decoded.email){
      return res.status(403).send({message: "forbiedden access"})
    }
    const query = {email : email}
    const user = await usersCollection.findOne(query)
    let admin = false ;
    if(user){
      admin = user?.role === 'admin'
    } 
    res.send({admin});
  })


  //getting the loginUsers 
  
  app.get('/loginUsers' , verifyToken, verifyAdmin,async (req,res)=> {
    console.log(req.headers)
    const result = await usersCollection.find().toArray()
    res.send(result)
  })




    // making admin 
    // app.patch('/loginUsers/admin/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const updatedDoc = {
    //     $set: {
    //       role: 'admin'
    //     }
    //   };
    
    //   try {
    //     const result = await usersCollection.updateOne(filter, updatedDoc);
    //     res.send(result);
    //   } catch (error) {
    //     console.error("Error updating user role:", error);
    //     res.status(500).send({ message: 'Failed to update user role' });
    //   }
    // });
    
    app.get('/allBookings/:email',verifyToken, async (req, res) => {
      const result = await bookingsCollection.find().toArray();
      res.send(result);
    });



    // Recommendations findings
    app.get('/recommendations',async (req, res) => {
      const result = await recCollection.find().toArray();
      res.send(result);
    });

    // AllTest findings
    app.get('/allTest' ,async (req, res) => {
      const result = await allTestCollection.find().toArray();
      res.send(result);
    });

   
    // all bookings findings
    app.get('/allBookings' ,async (req, res) => {
      const result = await bookingsCollection.find().toArray();
      res.send(result);
    });


    // all banners getting
    app.get('/allBanners', verifyToken , verifyAdmin,async (req, res) => {
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


// delivered reports
 
app.get('/userReports/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
      const query = { userId: userId, reportStatus: 'delivered' };
      const results = await bookingsCollection.find(query).toArray();
      res.send(results);
  } catch (error) {
      res.status(500).send({ message: 'Failed to fetch reports', error });
  }
});


// Update user status
app.put('/updateUserStatus/:userId', async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  console.log("Received userId:", userId);
  console.log("Received status:", status);

  try {
    const result = await bookingsCollection.updateOne(
      { uid: userId }, // Use 'uid' field for matching
      { $set: { status } }
    );

    if (result.matchedCount === 1) {
      res.send({ success: true, message: 'User status updated successfully' });
    } else {
      res.status(404).send({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).send({ success: false, message: 'Error updating user status', error });
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
      console.log(req.body);
      
      const result = await bookingsCollection.insertOne(paymentInfo);
      
      const testQuery = { name: paymentInfo.name };
    
      const test = await allTestCollection.findOne(testQuery);
      if (test) {
        let slots = parseInt(test.slots, 10); 
        if (slots > 0) {
          slots -= 1; 
          const updateDoc = {
            $set: { slots: slots.toString() } 
          };
          const updateSlotsCount = await allTestCollection.updateOne(testQuery, updateDoc);
          console.log(updateSlotsCount);
          
          res.send(result);
        } else {
          res.status(400).send({ message: 'No slots available' });
        }
      } else {
        res.status(404).send({ message: 'Test not found' });
      }
    });
    


  //   app.post('/userTest', async (req, res) => {
  //     const paymentInfo = req.body;
  //     const testName = paymentInfo.name;
  
  //     // Find the test document by name and ensure slots are greater than 0
  //     const test = await allTestCollection.findOneAndUpdate(
  //         { name: testName, slots: { $gt: 0 } }, // Find the test by name and ensure slots are greater than 0
  //         { $inc: { slots: -1 } }, // Decrease slots by 1
  //         { returnOriginal: false } // Return the updated document
  //     );
  
  //     // Check if a document was updated
  //     if (test.value) {
  //         // Insert the new booking
  //         const bookingResult = await bookingsCollection.insertOne(paymentInfo);
  //         res.send(bookingResult);
  //     } else {
  //         // Return an error if slots are not available
  //         res.status(400).json({ error: "No slots available for this test" });
  //     }
  // });
  
  

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


// Cancel a reservation
app.put('/cancelReservation/:id', async (req, res) => {
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid ID" });
  }

  try {
      const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: 'Cancelled' } }
      );
      if (result.matchedCount === 1) {
          res.send({ message: 'Reservation cancelled successfully' });
      } else {
          res.status(404).send({ message: 'Reservation not found' });
      }
  } catch (error) {
      res.status(500).send({ message: "Failed to cancel reservation", error });
  }
});

// Submit test result
app.put('/submitResult/:id', async (req, res) => {
  const id = req.params.id;
  const { resultLink } = req.body;

  if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid ID" });
  }

  try {
      const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { reportStatus: 'Delivered', resultLink: resultLink } }
      );
      if (result.matchedCount === 1) {
          res.send({ message: 'Test result submitted successfully' });
      } else {
          res.status(404).send({ message: 'Reservation not found' });
      }
  } catch (error) {
      res.status(500).send({ message: "Failed to submit test result", error });
  }
});



  // cancel reservation
app.delete('/cancelReservation/:id', async (req, res) => {
  const id = req.params.id;
  try {
      const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
  } catch (error) {
      res.status(500).send({ message: 'Failed to delete reservation', error });
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
