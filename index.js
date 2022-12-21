const express = require('express');
const SSLCommerzPayment = require('sslcommerz-lts')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const jwt = require('jsonwebtoken')


const app = express()
const port = process.env.PORT || 8000;

const store_id = process.env.STORED_ID
const store_passwd = process.env.STORED_PASSWORD
const is_live = false //true for live, false for sandbox

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.msatzvk.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// mongoDB start
const run = async () => {
    try {
        const studentsFullInfoCollection = client.db("projectTM").collection("studentsFullInfo");
        const usersDataCollections = client.db("projectTM").collection("usersData")
        const hostCollections = client.db("projectTM").collection("hostsData")
        const eventsCollection = client.db("projectTM").collection("upcommingEvents")
        const adminsCollection = client.db("projectTM").collection("AdminsData")
        const commentCollection = client.db("projectTM").collection("blogComment")
        const blogsCollection = client.db("projectTM").collection("blogs")
        const projectsCollection = client.db("projectTM").collection("projects")
        const tmuserCollection = client.db("projectTM").collection("tmUser")
        const noticeCollection = client.db("projectTM").collection("tmNotice")
        const eventpaymentCollection = client.db("projectTM").collection("paymentInfo")

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
            const result = await usersDataCollections.updateOne(filter, updateDoc, options)
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


        // tmuser put to db 
        app.put('/tmuser/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const user = req.body
                const filter = { email: email }
                const options = { upsert: true };
                const updateDoc = {
                    $set: user
                }
                const result = await tmuserCollection.updateOne(filter, updateDoc, options)

                // token generate
                const token = jwt.sign(
                    { email: email },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: "7d" }
                )
                res.send({
                    status: "success",
                    message: "token Created Successfully",
                    data: token
                })
            } catch (err) {
                console.log(err)
            }
        })

        // get user full data 
        app.get('/tmuserfulldata/:email', async (req, res) => {
            const email = req.params.email
            const query = {
                email: email
            }
            const userFullData = await tmuserCollection.findOne(query)
            res.send(userFullData)
        })


        //    get a single admin by email 
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }

            const admin = await adminsCollection.findOne(query)
            res.send(admin)
        })

        // user data save 
        app.post('/usersdata', async (req, res) => {
            const user = req.body;
            const result = await usersDataCollections.insertOne(user)
            res.send(result)
        })

        app.get('/usersall/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await tmuserCollection.findOne(query)
            res.send(user)
        })


        //  get all admin requests
        app.get('/admins', async (req, res) => {
            const admins = await adminsCollection.find().toArray()
            res.send(admins)
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
                    email: email
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

        // get all blogs 
        app.get('/displayblog', async (req, res) => {
            const blogs = await blogsCollection.find().sort({ $natural: -1 }).limit(3).toArray()
            res.send(blogs)
        })


        // get one blog by id 
        app.get('/detailsblog/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await blogsCollection.findOne(query)
            res.send(result)
        })

        // blog comment 
        app.post('/comment', async (req, res) => {
            const comment = req.body
            const result = await commentCollection.insertOne(comment)
            res.send(result)
        })

        // comment get 
        app.get('/commentsbyid', async (req, res) => {
            let query = {}
            const commentID = req.query.commentID
            if (commentID) {
                query = {
                    commentID: commentID
                }
            }
            const comment = await commentCollection.find(query).sort({ $natural: -1 }).limit(2).toArray()
            res.send(comment)
        })

        // get all blogs by query email for host
        app.get('/allblogsforhost', async (req, res) => {
            let query = {}
            const email = req.query.email;
            if (email) {
                query = {
                    email: email
                }
            }

            const blogs = await blogsCollection.find(query).toArray()
            res.send(blogs)
        })

        // blog delete
        app.delete('/hostblog/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await blogsCollection.deleteOne(filter)
            res.send(result)
        })


        // post a notice
        app.post('/notice', async (req, res) => {
            const notice = req.body
            const result = await noticeCollection.insertOne(notice)
            res.send(result)
        })


        // get all events 
        app.get('/letestnotice', async (req, res) => {
            const notice = await noticeCollection.find().sort({ $natural: -1 }).limit(11).toArray()
            res.send(notice)
        })

        // get one notice by id 
        app.get('/detailsnotice/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await noticeCollection.findOne(query)
            res.send(result)
        })

        // 
        // 
        // 
        // ssl commerz payment

        app.get('/eventpaymentinfo', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await eventsCollection.findOne(query)
            res.send(result)
        })

        app.post('/eventpayment', async (req, res) => {
            const eventpayment = req.body
            const { eventData, currency, phone } = eventpayment
            console.log(eventpayment)

            if (!eventData || !currency || !phone) {
                return res.send({
                    error: "Please Provide all the Information."
                })
            }
            const paymentedEvent = await eventsCollection.findOne({ _id: ObjectId(eventpayment.eventData) })
            console.log(paymentedEvent)

            const transactionId = new ObjectId().toString()
            const data = {
                total_amount: paymentedEvent.price,
                currency: eventpayment.currency,
                tran_id: transactionId, // use unique tran_id for each api call
                success_url: `${process.env.SERVER_URL}/payment/success?transactionId=${transactionId}`,
                fail_url: `${process.env.SERVER_URL}/payment/fail`,
                cancel_url: `${process.env.SERVER_URL}/payment/cancel`,
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                product_name: 'Computer',
                product_category: 'Electronic',
                product_profile: 'general',
                cus_name: eventpayment.name,
                cus_email: eventpayment.email,
                cus_add1: 'Dhaka',
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: eventpayment.phone,
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
            };
            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
            sslcz.init(data).then(apiResponse => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL
                console.log(apiResponse)
                eventpaymentCollection.insertOne({
                    ...eventpayment,
                    price: paymentedEvent.price,
                    transactionId,
                    paid: false
                })
                res.send({ url: GatewayPageURL })
                console.log('Redirecting to: ', GatewayPageURL)
            });
        })

        // [ayment]
        app.post('/payment/success', async (req, res) => {
            console.log('success')
            const { transactionId } = req.query

            if (!transactionId) {
                return res.redirect(`${process.env.WEBSITE_URL}/payment/fail`)
            }
            console.log(transactionId)
            const result = await eventpaymentCollection.updateOne({ transactionId },
                { $set: { paid: true, paidAt: new Date() } })

            if (result.modifiedCount > 0) {
                res.redirect(`${process.env.WEBSITE_URL}/payment/success?transactionId=${transactionId}`)
            }
        })

        app.post('/payment/fail', async (req, res) => {
            const { transactionId } = req.query

            if (!transactionId) {
                return res.redirect(`${process.env.WEBSITE_URL}/payment/fail`)
            }
            const result = await eventpaymentCollection.deleteOne({ transactionId })
            if (result.deletedCount) {
                res.redirect(`${process.env.WEBSITE_URL}/payment/fail`)
            }
        })

        app.get('/eventpayment/by-transaction-id/:id', async (req, res) => {
            const { id } = req.params
            const paymentInfo = await eventpaymentCollection.findOne({ transactionId: id })
            res.send(paymentInfo)
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

        // get all events 
        app.get('/projects', async (req, res) => {
            const projects = await projectsCollection.find().sort({ $natural: -1 }).limit(3).toArray()
            res.send(projects)
        })

        app.get('/projects/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const project = await projectsCollection.findOne(query)
            res.send(project)
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


// echo "# project-tm-server" >> README.md
// git init
// git add README.md
// git commit -m "first commit"
// git branch -M main
// git remote add origin https://github.com/jayed-phero/project-tm-server.git
// git push -u origin main

// const jwt = require('jsonwebtoken')

// module.exports = function(req, res, next){
//     const token = req.header('auth-token')

//     if(!token) return res.status(401).send("Unauthenticated")

//     try {
//         const studentInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
//         req.user = studentInfo
//     } catch (error) {
//         res.status(403).send("Invalid token")
//     }
// }