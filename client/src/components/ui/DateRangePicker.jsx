import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export function DateRangePicker({ startDate, endDate, onChange }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 bg-surface-2 p-1 rounded-md border border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all shadow-sm date-picker-wrapper w-full sm:w-auto">
      <DatePicker
        selected={startDate ? new Date(startDate) : null}
        onChange={(date) => onChange('startDate', date ? date.toISOString().split('T')[0] : '')}
        selectsStart
        startDate={startDate ? new Date(startDate) : null}
        endDate={endDate ? new Date(endDate) : null}
        placeholderText="Start Date"
        className="bg-transparent border-none text-sm text-ink focus:ring-0 px-2 py-1 outline-none w-28 placeholder:text-ink-muted cursor-pointer"
        dateFormat="yyyy-MM-dd"
        withPortal={isMobile}
        onFocus={e => isMobile && e.target.blur()}
      />
      <span className="text-ink-muted text-xs font-semibold uppercase">to</span>
      <DatePicker
        selected={endDate ? new Date(endDate) : null}
        onChange={(date) => onChange('endDate', date ? date.toISOString().split('T')[0] : '')}
        selectsEnd
        startDate={startDate ? new Date(startDate) : null}
        endDate={endDate ? new Date(endDate) : null}
        minDate={startDate ? new Date(startDate) : null}
        placeholderText="End Date"
        className="bg-transparent border-none text-sm text-ink focus:ring-0 px-2 py-1 outline-none w-28 placeholder:text-ink-muted cursor-pointer"
        dateFormat="yyyy-MM-dd"
        withPortal={isMobile}
        onFocus={e => isMobile && e.target.blur()}
      />
      {(startDate || endDate) && (
        <button 
          onClick={() => { onChange('startDate', ''); onChange('endDate', ''); }}
          className="text-xs text-ink-muted hover:text-danger px-2 transition-colors font-semibold"
          title="Clear Dates"
        >
          ✕
        </button>
      )}
    </div>
  );
}
