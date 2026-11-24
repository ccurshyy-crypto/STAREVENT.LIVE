import { ArrowLeft } from 'lucide-react';
import { EventCategoryId, Language } from '../data/content';
import { BookingCalendarSection } from './BookingCalendarSection';
import { BookingSection } from './BookingSection';

interface BookingPageProps {
  lang: Language;
  selectedEvent: EventCategoryId;
  onChangeEvent: (category: EventCategoryId) => void;
  selectedPackageId: string;
  onChangePackage: (packageId: string) => void;
  selectedAddOns: string[];
  selectedDate: string;
  onChangeDate: (isoDate: string) => void;
  onOpenPackages: () => void;
  onBackHome: () => void;
}

export function BookingPage({
  lang,
  selectedEvent,
  onChangeEvent,
  selectedPackageId,
  onChangePackage,
  selectedAddOns,
  selectedDate,
  onChangeDate,
  onOpenPackages,
  onBackHome,
}: BookingPageProps) {
  return (
    <div className="relative">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-7">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white/90 hover:text-[#FFE600] bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {lang === 'mr'
              ? 'होम पेजवर परत जा'
              : lang === 'hi'
                ? 'होम पेज पर वापस जाएं'
                : lang === 'gu'
                  ? 'હોમ પેજ પર પાછા જાઓ'
                  : 'Back to Home'}
          </span>
        </button>
      </div>

      {/* Interactive Event Booking Calendar right at the top of Booking Ur Order */}
      <BookingCalendarSection
        lang={lang}
        heading="BOOKING UR ORDER"
        onSelectDateForBooking={onChangeDate}
      />

      {/* Complete Direct Booking Form & Studio Hotline below */}
      <BookingSection
        lang={lang}
        selectedEvent={selectedEvent}
        onChangeEvent={onChangeEvent}
        selectedPackageId={selectedPackageId}
        onChangePackage={onChangePackage}
        selectedAddOns={selectedAddOns}
        selectedDate={selectedDate}
        onChangeDate={onChangeDate}
        onOpenPackages={onOpenPackages}
      />
    </div>
  );
}
