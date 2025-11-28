import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const products = [
  { id: "internship", name: "Internship / First Job", price: 2.99 },
  { id: "job", name: "Job Interview", price: 3.99 },
  { id: "case", name: "Case Study / Business Challenge", price: 3.99 },
  { id: "promotion", name: "Promotion Interview", price: 3.99 },
  { id: "review", name: "Annual Review", price: 3.99 },
  { id: "goal", name: "Goal-Setting Session", price: 3.99 },
  { id: "mobility", name: "Mobility / Career Change", price: 3.99 },
  { id: "practice", name: "Practice Mode", price: 3.99 },
  { id: "strategic", name: "Strategic Case / Board Presentation", price: 6.99 },
];

(async () => {
  try {
    console.log("🧾 Creating Stripe products and prices for Nova RH...\n");
    for (const p of products) {
      const product = await stripe.products.create({ name: p.name, metadata: { nova_id: p.id } });
      const price = await stripe.prices.create({
        unit_amount: Math.round(p.price * 100),
        currency: "eur",
        product: product.id,
      });
      console.log(`✅ ${p.name.padEnd(35)} → ${price.id} (${p.price.toFixed(2)} €)`);
    }
    console.log("\n🎉 Done! Copy these Price IDs into your .env.local file.");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
