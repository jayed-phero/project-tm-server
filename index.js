const express = require('express');
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const jwt = require('jsonwebtoken')


const app = express()
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());


const uri = process.env.DB_USER;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// mongoDB start
const run = async () => {
    try {
        const studentsFullInfoCollection = client.db("projectTM").collection("studentsFullInfo");
        const usersDataCollections = client.db("projectTM").collection("usersData")
        const hostCollections = client.db("projectTM").collection("hostsData")
        const eventsCollection = client.db("projectTM").collection("upcommingEvents")
        const adminsCollection = client.db("projectTM").collection("AdminsData")
        const blogsCollection = client.db("projectTM").collection("blogs")

        // studentFullInfo post
        app.post('/studentsfullinfo', async (req, res) => {
            const studentsInfo = req.body;
            const studentsFullInfo = await studentsFullInfoCollection.insertOne(studentsInfo);
            res.send(studentsFullInfo);
        })

        app.post('/studentlogin', async (req, res) => {
            const { email, password, studentId } = req.body;

            const query = {
                email: email,
                password: password,
                // studentId: studentId
            }

            if (!email || !password) {
                return res.send({
                    status: "error",
                    messgae: "Please provide all the values"
                })
            }

            const studentInfo = await studentsFullInfoCollection.findOne(query)

            if (!studentInfo) {
                return res.send({
                    status: "error",
                    message: "User does not exists",
                });
            }

            const isPasswordCorrectUser = await studentsFullInfoCollection.findOne(query)

            if (!isPasswordCorrectUser) {
                return res.send({
                    status: "error",
                    message: "Invalid credintials",
                });
            }

            delete isPasswordCorrectUser.password;

            const token = jwt.sign(isPasswordCorrectUser, process.env.ACCESS_TOKEN_SECRET);

            res.send({
                status: "success",
                data: isPasswordCorrectUser,
                token: token
            })
        })



        // student login data
        app.put('/host/:email', async (req, res) => {
            const email = req.params.email
            const host = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: host,
            }
            const result = await hostCollections.updateOne(filter, updateDoc, options)
            // console.log(result) 
            const token = jwt.sign(host, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            })
            res.send({ result, token })
        })


        // admin signup data
        app.put('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const admin = req.body;
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: admin
            }
            const result = await adminsCollection.updateOne(filter, updateDoc, options)

            const token = jwt.sign(admin, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '3d'
            })
            res.send({ result, token })
        })


        //    get a single admin by email 
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }

            const admin = await adminsCollection.findOne(query)
            res.send(admin)
        })


        //  get all admin requests
        app.get('/admins', async (req, res) => {
            const admins = await adminsCollection.find().toArray()
            res.send(admins)
        })





        // user data save 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersDataCollections.insertOne(user)
            res.send(result)
        })


        // event add
        app.post('/events', async (req, res) => {
            const events = req.body
            const result = await eventsCollection.insertOne(events)
            res.send(result)
        })


        // get all events 
        app.get('/ucevents', async (req, res) => {
            const events = await eventsCollection.find().sort({ $natural: -1 }).limit(3).toArray()
            res.send(events)
        })

        // get one for display head image
        app.get('/cevents', async (req, res) => {
            const events = await eventsCollection.find().sort({ $natural: -1 }).limit(1).toArray()
            res.send(events)
        })


        // get all events by query email for host
        app.get('/eventsall', async (req, res) => {
            let query = {}
            const email = req.query.email;
            if (email) {
                query = {
                    email : email
                }
            }

            const events = await eventsCollection.find(query).toArray()
            res.send(events)
        })

        // app.get('/allevents', async (req, res) => {
        //     const events = await eventsCollection.find().toArray()
        //     res.send(events)
        // })


        app.get('/allevents/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const events = await eventsCollection.findOne(query)
            res.send(events)
        })

        // blog system 
          // event add
          app.post('/blogs', async (req, res) => {
            const blog = req.body
            const result = await blogsCollection.insertOne(blog)
            res.send(result)
        })

        // get all events 
        app.get('/displayblog', async (req, res) => {
            const blogs = await blogsCollection.find().sort({ $natural: -1 }).limit(3).toArray()
            res.send(blogs)
        })


        // get one blog by id 
        app.get('/detailsblog/:id', async (req, res) => {
           const id = req.params.id 
           const query = {_id: ObjectId(id)}
           const result = blogsCollection.findOne(query)
           res.send(result)
        })

        // get all blogs by query email for host
        app.get('/allblogsforhost', async (req, res) => {
            let query = {}
            const email = req.query.email;
            if (email) {
                query = {
                    email : email
                }
            }

            const blogs = await blogsCollection.find(query).toArray()
            res.send(blogs)
        })


        // PAYMENT
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body
            const price = booking.price
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })
    }
    catch (error) {
        console.log(error)
    }
}

run()



app.get('/', (req, res) => {
    res.send('Project TM is running')
})


app.listen(port, () => {
    console.log(`Project TM running on ${port}`)
})