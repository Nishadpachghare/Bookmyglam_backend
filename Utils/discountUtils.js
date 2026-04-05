import Coupon from "../models/coupon.js";
import Offer from "../models/offer.js";

const normalizeText = (value) => value?.toString().trim() || "";
const normalizeLower = (value) => normalizeText(value).toLowerCase();

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const calculateDiscountData = (
  discountBaseAmount,
  discount,
  totalAmount = discountBaseAmount,
) => {
  const discountAmount = Math.round(
    (Number(discountBaseAmount || 0) * discount) / 100,
  );
  const finalAmount = Math.round(Number(totalAmount || 0) - discountAmount);

  return {
    discount,
    discountAmount,
    finalAmount,
  };
};

const normalizeSelectedService = (service) => {
  if (typeof service === "string") {
    return {
      name: normalizeLower(service),
      displayName: normalizeText(service),
      price: 0,
    };
  }

  const serviceName =
    service?.serviceName ?? service?.service ?? service?.name ?? "";

  return {
    name: normalizeLower(serviceName),
    displayName: normalizeText(serviceName),
    price: Number(service?.price || 0),
  };
};

export const resolveDiscount = async ({
  code,
  totalAmount,
  selectedServices = [],
}) => {
  const trimmedCode = normalizeText(code);

  console.log("🔎 RESOLVING DISCOUNT:");
  console.log("  Searching for code:", trimmedCode);
  console.log("  Total amount:", totalAmount);
  console.log("  Selected services:", selectedServices?.map(s => s.serviceName));

  if (!trimmedCode) {
    return {
      success: false,
      status: 400,
      message: "Code or Offer is required",
    };
  }

  // Try exact match for coupon
  const coupon = await Coupon.findOne({ code: trimmedCode.toUpperCase() });

  if (coupon) {
    console.log("✅ Found coupon:", coupon.code);
    console.log("   Active:", coupon.active);
    console.log("   Discount:", coupon.discount);
    console.log("   Min Amount:", coupon.minAmount);
    console.log("   Valid From:", coupon.validFrom);
    console.log("   Valid Till:", coupon.validTill);
    console.log("   Expiry Date:", coupon.expiryDate);
    
    if (!coupon.active) {
      console.log("❌ Coupon is NOT active");
      return {
        success: false,
        status: 400,
        message: "Coupon code is not active",
      };
    }

    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      console.log("❌ Coupon expired (expiryDate)");
      return {
        success: false,
        status: 400,
        message: "Coupon code has expired",
      };
    }

    if (coupon.validFrom && new Date() < new Date(coupon.validFrom)) {
      console.log("❌ Coupon not yet valid (validFrom)");
      return {
        success: false,
        status: 400,
        message: "Coupon is not yet valid",
      };
    }

    if (coupon.validTill && new Date() > new Date(coupon.validTill)) {
      console.log("❌ Coupon expired (validTill)");
      return {
        success: false,
        status: 400,
        message: "Coupon code has expired",
      };
    }

    if (coupon.minAmount && Number(totalAmount) < coupon.minAmount) {
      console.log(`❌ Amount ${totalAmount} is less than minimum ${coupon.minAmount}`);
      return {
        success: false,
        status: 400,
        message: `Minimum booking amount of ₹${coupon.minAmount} required for this coupon (Your total: ₹${totalAmount})`,
      };
    }

    console.log(`✅ Coupon validation PASSED! Applying ${coupon.discount}% discount`);
    return {
      success: true,
      type: "coupon",
      message: "Coupon is valid",
      data: {
      code: coupon.code,
      description: coupon.description,
        ...calculateDiscountData(totalAmount, coupon.discount, totalAmount),
      },
    };
  }

  console.log("❌ Exact coupon match not found. Trying offers...");

  // Try exact match for offer
  const offer = await Offer.findOne({
    title: { $regex: `^${escapeRegExp(trimmedCode)}$`, $options: "i" },
  });

  if (!offer) {
    console.log("❌ Exact offer match not found. Searching for similar matches...");
    
    // Get all active coupons and offers for suggestion
    const activeCoupons = await Coupon.find({ active: true });
    const allCoupons = await Coupon.find({});
    
    console.log(`📊 ALL COUPONS IN DATABASE: ${allCoupons.length}`);
    allCoupons.forEach((c, idx) => {
      console.log(`     [${idx + 1}] Code: ${c.code} | Active: ${c.active} | Discount: ${c.discount}% | Min: ₹${c.minAmount}`);
    });
    
    console.log(`📊 ACTIVE COUPONS: ${activeCoupons.length}`);
    activeCoupons.forEach((c, idx) => {
      console.log(`     [${idx + 1}] ${c.code} - ${c.discount}% off`);
    });
    
    const activeOffers = await Offer.find({ active: true, published: true });
    console.log(`📊 Available active offers: ${activeOffers.length}`);
    
    // Find partial matches
    const searchLower = trimmedCode.toLowerCase();
    const matchingCoupons = activeCoupons.filter(c => c.code.toLowerCase().includes(searchLower));
    const matchingOffers = activeOffers.filter(o => o.title.toLowerCase().includes(searchLower));
    
    if (matchingCoupons.length > 0 || matchingOffers.length > 0) {
      const suggestions = [];
      matchingCoupons.forEach(c => {
        suggestions.push(`"${c.code}" (Coupon - ${c.discount}% off)`);
      });
      matchingOffers.forEach(o => {
        suggestions.push(`"${o.title}" (Offer - ${o.discount}% off)`);
      });
      
      return {
        success: false,
        status: 404,
        message: `"${trimmedCode}" not found. Did you mean: ${suggestions.join(", ")}?`,
      };
    }

    return {
      success: false,
      status: 404,
      message: `Invalid coupon code or offer "${trimmedCode}". Please select from available offers or coupons.`,
    };
  }

  console.log("✅ Found offer:", offer.title);

  if (!offer.active || !offer.published) {
    console.log(`❌ Offer not active (active: ${offer.active}, published: ${offer.published})`);
    return {
      success: false,
      status: 400,
      message: "Offer is not available",
    };
  }

  const now = new Date();
  if (offer.startDate && new Date(offer.startDate) > now) {
    return {
      success: false,
      status: 400,
      message: "Offer has not started yet",
    };
  }

  if (offer.endDate && new Date(offer.endDate) < now) {
    return {
      success: false,
      status: 400,
      message: "Offer has ended",
    };
  }

  const normalizedOfferServices = (offer.services || [])
    .map((service) => normalizeLower(service))
    .filter(Boolean);
  const normalizedSelectedServices = (selectedServices || [])
    .map((service) => normalizeSelectedService(service))
    .filter((service) => service.name);
  const applicableServices = normalizedSelectedServices.filter((service) =>
    normalizedOfferServices.includes(service.name),
  );

  // ✅ DEBUG LOGGING: Service Matching
  console.log("🔍 OFFER VALIDATION - Service Matching Debug:");
  console.log("  Offer services (raw):", offer.services);
  console.log("  Offer services (normalized):", normalizedOfferServices);
  console.log("  Selected services (raw):", selectedServices?.map(s => s.serviceName || s.service || s.name));
  console.log("  Selected services (normalized):", normalizedSelectedServices);
  console.log("  Applicable services:", applicableServices);

  // ✅ FIX: Offers MUST have services configured and match at least one selected service
  if (normalizedOfferServices.length === 0) {
    console.error("❌ Offer has NO services configured");
    return {
      success: false,
      status: 400,
      message: "This offer is not properly configured. Please contact support.",
    };
  }

  if (applicableServices.length === 0) {
    console.error(`❌ No selected services match offer services. Offer: ${normalizedOfferServices.join(", ")}, Selected: ${normalizedSelectedServices.map(s => s.name).join(", ")}`);
    return {
      success: false,
      status: 400,
      message: `Offer "${offer.title}" is only applicable for: ${offer.services.join(", ")}`,
    };
  }

  console.log(`✅ Offer validation passed! ${applicableServices.length} service(s) match`);

  // ✅ Apply discount only on applicable services
  const applicableAmount = applicableServices.reduce((sum, service) => sum + service.price, 0);

  return {
    success: true,
    type: "offer",
    message: "Offer is valid",
    data: {
      code: offer.title,
      description: offer.description,
      applicableAmount: Math.round(applicableAmount),
      appliedServices: applicableServices.map((service) => service.displayName),
      ...calculateDiscountData(applicableAmount, offer.discount, totalAmount),
    },
  };
};
