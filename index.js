const express = require('express')
const app = express()
require('dotenv').config();

const cors = require('cors')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const port = process.env.PORT || 5000 ;


//middlewares 

app.use(cors())
app.use(express.json())




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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const testCollection = client.db("testsDb").collection("users");
    const recCollection = client.db("testsDb").collection("recommendations")
    const allTestCollection = client.db("testsDb").collection("allTest")




  //recommendations findings 

  app.get('/recommendations' , async (req ,res)=> {
    const result = await recCollection.find().toArray()
    res.send(result)
  }) 

  //allTest findings 
  app.get('/allTest' , async (req ,res)=> {
    const result = await allTestCollection.find().toArray()
    res.send(result)
  }) 

  //single test details
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




 // adding users
   app.post('/allTest' , async(req,res)=> { 
    const allTests = req.body 
    const result = await allTestCollection.insertOne(allTests)
    res.send(result)
  
   }) 

  //  adding the test data 
    
  app.post('/users' , async(req,res)=> { 
    const userInfo = req.body 
    const result = await testCollection.insertOne(userInfo)
    res.send(result)
  
   }) 


  //  payment intent
   app.post('/create-payment-intent', async(req,res)=> {
    const price = req.body.price ;
    const priceInCent = parseFloat(price) * 100;
    if(!price || priceInCent < 1) return

    const {client_secret} = await stripe.paymentIntents.create({
      amount : price ,
      currency : 'usd',

      automatic_payment_methods: {
        enabled : true
      }
    });

    res.send({
      clientSecret : client_secret
    })

   })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/' , (req , res) =>{
    res.send("labX is running")
}) 

app.listen(port , ()=> {
    console.log(`labX is running on the port ${port}`)
})