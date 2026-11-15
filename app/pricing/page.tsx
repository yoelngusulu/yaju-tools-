import Link from "next/link";

type Plan = {
  name: string;
  price: string;
  cadence?: string;
  description: string;
  features: string[];
  cta: string;
  href?: string;
  featured?: boolean;
  badge?: string;
};

function getPlans(): Plan[] {
  return [
    {
      name: "Free",
      price: "TSh 0",
      description:
        "Useful everyday tools supported by ads. No unnecessary paywall for simple jobs.",
      features: [
        "Single coordinate conversions",
        "Distance and area tools",
        "PDF split and merge",
        "Other basic tools with ads",
        "2 free bulk coordinate conversions per 24 hours",
      ],
      cta: "Use Free Tools",
      href: "/tools",
    },
    {
      name: "Daily Pass",
      price: "Coming Soon",
      description:
        "A short-term paid option is planned, but it is not available for purchase yet.",
      features: [
        "Planned: temporary access to selected paid tools",
        "Final features and limits will be published before launch",
      ],
      cta: "Not Available",
    },
    {
      name: "Pro Monthly",
      price: "Coming Soon",
      description:
        "A monthly plan for regular GIS, coordinate and document workflows is planned.",
      features: [
        "Planned: expanded access to selected tools",
        "Final features, limits and price will be published before launch",
      ],
      cta: "Not Available",
      featured: true,
      badge: "Most Popular",
    },
    {
      name: "Pro Yearly",
      price: "Coming Soon",
      description:
        "A yearly plan is planned but is not available for purchase yet.",
      features: [
        "Planned: access for longer-term professional use",
        "Final benefits and price will be published before launch",
      ],
      cta: "Not Available",
      badge: "Best Value",
    },
    {
      name: "Power User",
      price: "Coming Soon",
      description:
        "A higher-volume plan for professional workloads is under consideration.",
      features: [
        "Potential future option for higher-volume processing",
        "Availability, capacity and service levels are not confirmed",
      ],
      cta: "Not Available",
    },
  ];
}

export const metadata = {
  title: "Pricing | YAJU",
  description:
    "YAJU pricing for free, daily, Pro and high-volume users.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  const plans = getPlans();
  const paidCheckoutReady = false;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <section className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Pricing
          </p>

          <h1 className="mt-3 text-4xl font-bold text-gray-900">
            Free for simple jobs. Pro when your workload grows.
          </h1>

          <p className="mt-4 text-lg leading-8 text-gray-600">
            Basic YAJU tools stay useful and ad-supported. Bulk processing,
            heavier document conversions and premium capacity belong to paid
            plans.
          </p>
        </div>

        {!paidCheckoutReady && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm leading-6 text-amber-800">
            Paid checkout is still being configured. Free tools remain available
            while billing is being prepared.
          </div>
        )}

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex h-full flex-col rounded-2xl border bg-white p-7 shadow-sm ${
                plan.featured
                  ? "border-blue-500 ring-2 ring-blue-100"
                  : "border-gray-200"
              }`}
            >
              {plan.badge && (
                <span className="mb-4 w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {plan.badge}
                </span>
              )}

              <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>

              <div className="mt-3 flex flex-wrap items-end gap-1">
                <span className="text-3xl font-bold text-blue-600">
                  {plan.price}
                </span>
                {plan.cadence && (
                  <span className="pb-1 text-sm text-gray-500">
                    {plan.cadence}
                  </span>
                )}
              </div>

              <p className="mt-4 leading-7 text-gray-600">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-3 text-sm leading-6 text-gray-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="font-bold text-blue-600">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.href ? (
                <Link
                  href={plan.href}
                  className={`mt-8 rounded-xl px-5 py-3 text-center font-semibold transition ${
                    plan.featured
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-8 cursor-not-allowed rounded-xl bg-gray-100 px-5 py-3 text-center font-semibold text-gray-400"
                >
                  {plan.cta}
                </button>
              )}
            </article>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">
            Paid features are not available yet
          </h2>
          <p className="mt-3 leading-7 text-gray-600">
            Paid plans, checkout, processing credits and their limits are still being prepared.
            No payment should be made based on planned prices or features shown in drafts.
            We will publish confirmed prices, limits and included tools when purchase and access
            controls have been implemented and tested.
          </p>
        </div>
      </section>
    </main>
  );
}
