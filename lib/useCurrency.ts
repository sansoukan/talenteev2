// 🌍 useCurrency.ts — Détection automatique de devise (locale ou IP)
// ✅ Localhost : $ forcé
// ✅ Production : détection IP (Europe → €, UK → £, reste du monde → $)

export async function useCurrency() {
  try {
    // 🧪 Mode local : on force le dollar
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      return { symbol: "$", currency: "USD" };
    }

    // 🌍 Détection IP (production)
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("Bad response from IP API");

    const data = await res.json();
    const country = data.country_code || "US";

    // 🇬🇧 Royaume-Uni → GBP
    if (country === "GB") {
      return { symbol: "£", currency: "GBP" };
    }

    // 🇪🇺 Europe → EUR
    const euroZones = ["FR","DE","ES","IT","NL","BE","PT","LU","IE","GR","FI","AT"];
    if (euroZones.includes(country)) {
      return { symbol: "€", currency: "EUR" };
    }

    // 🌍 Reste du monde (Afrique, Asie, Middle East, Amérique du Sud, Océanie, USA, Canada)
    return { symbol: "$", currency: "USD" };
  } catch (error) {
    console.warn("🌐 Currency detection failed, fallback to USD:", error);
    return { symbol: "$", currency: "USD" };
  }
}
