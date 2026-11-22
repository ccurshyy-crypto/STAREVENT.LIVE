import { ArrowLeft } from 'lucide-react';
import { EventCategoryId, Language, UI_COPY } from '../data/content';
import { PreviewMode } from './LiveStudioPreview';
import { ServicesSection } from './ServicesSection';

interface ServicesPageProps {
  lang: Language;
  onPreviewEvent: (mode: PreviewMode) => void;
  onBookEvent: (category: EventCategoryId) => void;
  onBackHome: () => void;
}

/**
 * Dedicated Services Page (/services).
 * Keeps Services strictly in its own focused page rather than cluttering the Home page.
 */
export function ServicesPage({
  lang,
  onPreviewEvent,
  onBookEvent,
  onBackHome,
}: ServicesPageProps) {
  return (
    <div className="min-h-[75vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <button
          type="button"
          onClick={onBackHome}
          className="btn-glass-pro inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-100 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
        >
          <ArrowLeft className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
          <span>{UI_COPY.nav.home[lang]}</span>
        </button>
      </div>

      <ServicesSection
        lang={lang}
        onPreviewEvent={onPreviewEvent}
        onBookEvent={onBookEvent}
      />
    </div>
  );
}
