import { Check } from 'lucide-react';
import {
  ADDON_OPTIONS,
  CLIENT_OUTCOMES,
  Language,
  PRODUCTION_PACKAGES,
  UI_COPY,
} from '../data/content';

interface PackagesSectionProps {
  lang: Language;
  selectedPackageId: string;
  selectedAddOns: string[];
  onToggleAddOn: (addonId: string) => void;
  onSelectPackage: (packageId: string) => void;
}

export function PackagesSection({
  lang,
  selectedPackageId,
  selectedAddOns,
  onToggleAddOn,
  onSelectPackage,
}: PackagesSectionProps) {
  const addOnsTotal = ADDON_OPTIONS.filter((a) => selectedAddOns.includes(a.id)).reduce(
    (sum, item) => sum + item.price,
    0
  );

  return (
    <section id="packages" className="py-20 sm:py-24 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="max-w-3xl space-y-3 mb-12">
          <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
            {UI_COPY.packagesSection.kicker[lang]}
          </p>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white">
            {UI_COPY.packagesSection.heading[lang]}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            {UI_COPY.packagesSection.intro[lang]}
          </p>
        </div>

        {/* Optional Add-ons Selector Bar */}
        <div className="mb-10 bg-[#121216] border border-white/10 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-semibold text-white">
              {UI_COPY.packagesSection.addonsHeading[lang]}
            </h3>
            <span className="font-mono text-xs text-[#FACC15] tabular-nums">
              {lang === 'mr' ? 'अतिरिक्त जोड:' : 'Selected add-ons:'}{' '}
              +₹{addOnsTotal.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ADDON_OPTIONS.map((addon) => {
              const active = selectedAddOns.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() => onToggleAddOn(addon.id)}
                  aria-pressed={active}
                  className={`flex items-center justify-between gap-3 px-4 py-3 text-left rounded-xl border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                    active
                      ? 'bg-[#1D1618] border-[#DC2626] text-white'
                      : 'bg-[#16161B] border-white/10 text-zinc-300 hover:border-white/25'
                  }`}
                >
                  <span className="text-xs font-medium leading-snug">{addon.label[lang]}</span>
                  <span className="font-mono text-xs font-semibold text-[#FACC15] whitespace-nowrap tabular-nums">
                    +₹{addon.price.toLocaleString('en-IN')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Production Packages */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PRODUCTION_PACKAGES.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            const estimatedTotal = pkg.basePrice + addOnsTotal;

            return (
              <div
                key={pkg.id}
                className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between border transition-colors duration-150 ${
                  pkg.featured || isSelected
                    ? 'bg-[#151317] border-[#DC2626]/70'
                    : 'bg-[#121216] border-white/10 hover:border-white/25'
                }`}
              >
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-zinc-400">
                      {pkg.cameras[lang]} · {pkg.platforms[lang]}
                    </p>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                      {pkg.name[lang]}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      {pkg.idealFor[lang]}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <p className="font-mono text-2xl sm:text-3xl font-bold text-white tabular-nums">
                      ₹{estimatedTotal.toLocaleString('en-IN')}
                      <span className="text-xs font-sans font-normal text-zinc-400 ml-2">
                        {lang === 'mr' ? 'अंदाजित दर' : 'estimated base'}
                      </span>
                    </p>
                    {addOnsTotal > 0 && (
                      <p className="text-xs font-mono text-[#FACC15] mt-1 tabular-nums">
                        {pkg.priceRange[lang]} + ₹{addOnsTotal.toLocaleString('en-IN')}{' '}
                        {lang === 'mr' ? 'अतिरिक्त' : 'add-ons'}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-sm text-zinc-300">
                    {pkg.features[lang].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check
                          className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7 pt-5 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => onSelectPackage(pkg.id)}
                    className={`w-full py-3 px-4 text-sm font-semibold rounded-lg transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                      pkg.featured || isSelected
                        ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white'
                        : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                  >
                    {UI_COPY.packagesSection.selectPackageBtn[lang]}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Adjacent Broadcast Proof & Client Outcomes */}
        <div className="mt-20 pt-14 border-t border-white/10">
          <div className="max-w-2xl space-y-2 mb-10">
            <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
              {UI_COPY.packagesSection.proofKicker[lang]}
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {UI_COPY.packagesSection.proofHeading[lang]}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CLIENT_OUTCOMES.map((study) => (
              <article
                key={study.id}
                className="bg-[#121216] border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400">{study.category[lang]}</p>
                  <p className="font-mono text-base sm:text-lg font-bold text-[#FACC15] tabular-nums">
                    {study.metric[lang]}
                  </p>
                  <h4 className="font-display text-lg font-bold text-white">
                    {study.eventTitle[lang]}
                  </h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {study.summary[lang]}
                  </p>
                </div>
                <p className="pt-4 border-t border-white/8 text-xs font-medium text-zinc-300">
                  {study.attribution[lang]}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
