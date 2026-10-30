require("dotenv").config();
const express = require("express");
const path = require("path");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let productsCollection = null;

// Important: These sample prices are fictional demo data, not live retailer prices.
const demoProducts = [
  {id:"p001",name:"Wireless Bluetooth Headphones",category:"Electronics",image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80",offers:[{store:"Amazon",price:1499,url:"https://www.amazon.in/s?k=wireless+bluetooth+headphones"},{store:"Flipkart",price:1399,url:"https://www.flipkart.com/search?q=wireless+bluetooth+headphones"},{store:"Myntra",price:1599,url:"https://www.myntra.com/"},{store:"Meesho",price:899,url:"https://www.meesho.com/search?q=wireless%20bluetooth%20headphones"}]},
  {id:"p002",name:"Classic Running Shoes",category:"Fashion",image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80",offers:[{store:"Amazon",price:1899,url:"https://www.amazon.in/s?k=running+shoes"},{store:"Flipkart",price:1699,url:"https://www.flipkart.com/search?q=running+shoes"},{store:"Myntra",price:1499,url:"https://www.myntra.com/"},{store:"Meesho",price:799,url:"https://www.meesho.com/search?q=running%20shoes"}]},
  {id:"p003",name:"Everyday Backpack",category:"Accessories",image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80",offers:[{store:"Amazon",price:999,url:"https://www.amazon.in/s?k=everyday+backpack"},{store:"Flipkart",price:849,url:"https://www.flipkart.com/search?q=everyday+backpack"},{store:"Myntra",price:1199,url:"https://www.myntra.com/"},{store:"Meesho",price:499,url:"https://www.meesho.com/search?q=backpack"}]},
  {id:"p004",name:"Minimal Analog Watch",category:"Fashion",image:"https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=700&q=80",offers:[{store:"Amazon",price:1299,url:"https://www.amazon.in/s?k=analog+watch"},{store:"Flipkart",price:1099,url:"https://www.flipkart.com/search?q=analog+watch"},{store:"Myntra",price:999,url:"https://www.myntra.com/"},{store:"Meesho",price:399,url:"https://www.meesho.com/search?q=analog%20watch"}]},
  {id:"p005",name:"Stainless Steel Water Bottle",category:"Home",image:"https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=700&q=80",offers:[{store:"Amazon",price:599,url:"https://www.amazon.in/s?k=steel+water+bottle"},{store:"Flipkart",price:549,url:"https://www.flipkart.com/search?q=steel+water+bottle"},{store:"Myntra",price:699,url:"https://www.myntra.com/"},{store:"Meesho",price:299,url:"https://www.meesho.com/search?q=steel%20water%20bottle"}]},
  {id:"p006",name:"Cotton Casual T-Shirt",category:"Fashion",image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=80",offers:[{store:"Amazon",price:499,url:"https://www.amazon.in/s?k=cotton+t+shirt"},{store:"Flipkart",price:399,url:"https://www.flipkart.com/search?q=cotton+t+shirt"},{store:"Myntra",price:449,url:"https://www.myntra.com/"},{store:"Meesho",price:199,url:"https://www.meesho.com/search?q=cotton%20t%20shirt"}]},
  {id:"p007",name:"Wireless Computer Mouse",category:"Electronics",image:"https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=700&q=80",offers:[{store:"Amazon",price:699,url:"https://www.amazon.in/s?k=wireless+mouse"},{store:"Flipkart",price:599,url:"https://www.flipkart.com/search?q=wireless+mouse"},{store:"Myntra",price:799,url:"https://www.myntra.com/"},{store:"Meesho",price:249,url:"https://www.meesho.com/search?q=wireless%20mouse"}]},
  {id:"p008",name:"UV Protection Sunglasses",category:"Accessories",image:"https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=80",offers:[{store:"Amazon",price:799,url:"https://www.amazon.in/s?k=uv+sunglasses"},{store:"Flipkart",price:649,url:"https://www.flipkart.com/search?q=uv+sunglasses"},{store:"Myntra",price:599,url:"https://www.myntra.com/"},{store:"Meesho",price:199,url:"https://www.meesho.com/search?q=sunglasses"}]}
];

async function connectMongo() {
  if (!process.env.MONGODB_URI) {
    console.log("MongoDB URI not configured; using demo product data.");
    return;
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "pricepulse");
  productsCollection = db.collection("products");
  const count = await productsCollection.countDocuments();
  if (!count) await productsCollection.insertMany(demoProducts);
  console.log("Connected to MongoDB.");
}

app.get("/api/health", (req, res) => res.json({ok:true, database:productsCollection ? "MongoDB" : "demo mode"}));

app.get("/api/products", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const sort = String(req.query.sort || "relevance");
    let products = productsCollection ? await productsCollection.find({}).toArray() : demoProducts;
    if (q) products = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase()));
    if (category && category !== "All") products = products.filter(p => p.category === category);
    products = products.map(p => ({...p, bestPrice: Math.min(...p.offers.map(o => Number(o.price))), offers: [...p.offers].sort((a,b)=>a.price-b.price)}));
    if (sort === "low") products.sort((a,b)=>a.bestPrice-b.bestPrice);
    if (sort === "high") products.sort((a,b)=>b.bestPrice-a.bestPrice);
    res.json({products, demo: !productsCollection, message: productsCollection ? "Database results" : "Demo prices only — not live retailer prices"});
  } catch (err) {
    console.error(err);
    res.status(500).json({error:"Unable to load products"});
  }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

connectMongo().then(() => {
  app.listen(PORT, () => console.log(`PricePulse running at http://localhost:${PORT}`));
}).catch(err => {
  console.error("MongoDB connection failed:", err.message);
  console.log("Starting in demo mode.");
  app.listen(PORT, () => console.log(`PricePulse running at http://localhost:${PORT}`));
});
