import Coupon from "../models/coupon.js";
import Offer from "../models/offer.js";

const normalizeText = (value) => value?.toString().trim() || "";
const normalizeLower = (value) => normalizeText(value).toLowerCase();

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const calculateDiscountData = (
  discountBaseAmount,
  discountPercentage,
  totalAmount = discountBaseAmount,
) => {
  // ✅ Strict type coercion and validation
  const base = parseInt(discountBaseAmount) || 0;
  const percent = Math.max(0, Math.min(parseInt(discountPercentage) || 0, 100));
  const total = parseInt(totalAmount) || 0;
  
  // ✅ CRITICAL: If totalAmount provided and different from base,
  // it means base is applicable amount and total includes non-applicable services
  // In this case:
  // - discountAmount is calculated only on the applicable amount (base)
  // - finalAmount = total - discountAmount (includes all services minus discount)
  
  const discountAmount = Math.round((base * percent) / 100);
  
  // ✅ RULE: finalAmount always = total amount - discount amount
  // NOT = base - discount (which would exclude non-applicable services)
  const finalAmount = total - discountAmount;

  console.log(`💰 DISCOUNT CALCULATION:
    Base (Applicable Amount): ₹${base}
    Percent: ${percent}%
    Total (All Services): ₹${total}
    Discount (on applicable only): ₹${discountAmount}
    Final Price (all services - discount): ₹${finalAmount}`);

  if (total !== base) {
    console.log(`    Note: Discount applied to ₹${base} of ₹${total} total`);
  }

  return {
    discount: percent,
    discountAmount: Math.max(0, discountAmount),
    finalAmount: Math.max(0, finalAmount),
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
    if (!coupon.active) {
      return {
        success: false,
        status: 400,
        message: "Coupon code is not active",
      };
    }

    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      return {
        success: false,
        status: 400,
        message: "Coupon code has expired",
      };
    }

    if (coupon.validFrom && new Date() < new Date(coupon.validFrom)) {
      return {
        success: false,
        status: 400,
        message: "Coupon is not yet valid",
      };
    }

    if (coupon.validTill && new Date() > new Date(coupon.validTill)) {
      return {
        success: false,
        status: 400,
        message: "Coupon code has expired",
      };
    }

    if (coupon.minAmount && Number(totalAmount) < coupon.minAmount) {
      return {
        success: false,
        status: 400,
        message: `Minimum booking amount of ₹${coupon.minAmount} required for this coupon (Your total: ₹${totalAmount})`,
      };
    }

    // ✅ Check service criteria for coupons (if specified)
    const couponServices = (coupon.services || [])
      .map((service) => normalizeLower(service))
      .filter(Boolean);

    if (couponServices.length > 0) {
      const normalizedSelectedServices = (selectedServices || [])
        .map((service) => normalizeSelectedService(service))
        .filter((service) => service.name);

      const hasApplicableService = normalizedSelectedServices.some((service) =>
        couponServices.includes(service.name),
      );

      if (!hasApplicableService) {
        return {
          success: false,
          status: 400,
          message: `Coupon "${coupon.code}" is only applicable for: ${coupon.services.join(", ")}`,
        };
      }
    }

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
    // Optimized search: only query once with both filters
    const [activeCoupons, activeOffers] = await Promise.all([
      Coupon.find({ active: true }).select("code discount minAmount services").lean(),
      Offer.find({ active: true, published: true }).select("title discount services").lean(),
    ]);

    const searchLower = trimmedCode.toLowerCase();
    const matchingCoupons = activeCoupons.filter(c => c.code.toLowerCase().includes(searchLower)).slice(0, 3);
    const matchingOffers = activeOffers.filter(o => o.title.toLowerCase().includes(searchLower)).slice(0, 3);

    if (matchingCoupons.length > 0 || matchingOffers.length > 0) {
      const suggestions = [];
      matchingCoupons.forEach(c => {
        suggestions.push(`"${c.code}" (${c.discount}% off)`);
      });
      matchingOffers.forEach(o => {
        suggestions.push(`"${o.title}" (${o.discount}% off)`);
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
      message: `Invalid coupon or offer. Check available options.`,
    };
  }

  if (!offer.active || !offer.published) {
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

  if (normalizedOfferServices.length === 0) {
    return {
      success: false,
      status: 400,
      message: "This offer is not properly configured.",
    };
  }

  if (applicableServices.length === 0) {
    return {
      success: false,
      status: 400,
      message: `Offer only applicable for: ${offer.services.join(", ")}`,
    };
  }

  const applicableAmount = applicableServices.reduce((sum, service) => sum + service.price, 0);

  console.log(`
  ═════════════════════════════════════════
  🎁 OFFER CALCULATION:
    Offer Services: ${offer.services.join(", ")}
    Selected Services: ${normalizedSelectedServices.map(s => `${s.displayName} ₹${s.price}`).join(", ")}
    Applicable Services: ${applicableServices.map(s => `${s.displayName} ₹${s.price}`).join(", ")}
    Applicable Amount: ₹${applicableAmount}
    Total Booking Amount: ₹${totalAmount}
  ═════════════════════════════════════════
  `);

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
