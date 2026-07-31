"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";

type ProjectDatePickerProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  required?: boolean;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  variant?: "line" | "panel";
};

type CalendarCell = {
  iso: string;
  label: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
};

const WEEK_START = 0;

function localeTag(locale: Locale) {
  return locale === "ar" ? "ar-SY-u-nu-latn" : "en-US-u-nu-latn";
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12);

  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(left: Date | null, right: Date | null) {
  if (!left || !right) return false;

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getCopy(locale: Locale) {
  if (locale === "ar") {
    return {
      placeholder: "اختر التاريخ",
      clear: "مسح",
      today: "اليوم",
      previousMonth: "الشهر السابق",
      nextMonth: "الشهر التالي",
    };
  }

  return {
    placeholder: "Choose date",
    clear: "Clear",
    today: "Today",
    previousMonth: "Previous month",
    nextMonth: "Next month",
  };
}

export function ProjectDatePicker({
  id,
  label,
  value,
  onChange,
  locale,
  required,
  disabled,
  onOpen,
  onClose,
  variant = "line",
}: ProjectDatePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const today = useMemo(() => new Date(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(selectedDate ?? today),
  );
  const [popoverStyle, setPopoverStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const tag = localeTag(locale);
  const copy = getCopy(locale);

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;

    if (!trigger || !popover) return;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const preferredWidth = Math.max(triggerRect.width, 320);
    const width = Math.min(preferredWidth, viewportWidth - 24);
    const popoverHeight = popover.getBoundingClientRect().height;
    const alignRight = locale === "ar";
    const gap = 12;
    const minInset = 12;

    const nextLeft = alignRight
      ? triggerRect.right - width
      : triggerRect.left;
    const clampedLeft = Math.min(
      Math.max(minInset, nextLeft),
      viewportWidth - width - minInset,
    );

    const belowTop = triggerRect.bottom + gap;
    const aboveTop = triggerRect.top - popoverHeight - gap;
    const fitsBelow = belowTop + popoverHeight <= viewportHeight - minInset;
    const fitsAbove = aboveTop >= minInset;

    let top = belowTop;
    if (!fitsBelow && fitsAbove) {
      top = aboveTop;
    } else if (!fitsBelow) {
      top = Math.max(
        minInset,
        Math.min(belowTop, viewportHeight - popoverHeight - minInset),
      );
    }

    setPopoverStyle({
      top,
      left: clampedLeft,
      width,
    });
  }, [locale]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const isInsideTrigger = rootRef.current?.contains(target);
      const isInsidePopover = popoverRef.current?.contains(target);

      if (!isInsideTrigger && !isInsidePopover) {
        setIsOpen(false);
        onClose?.();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        onClose?.();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const rafId = window.requestAnimationFrame(() => {
      updatePopoverPosition();
    });

    function handleViewportChange() {
      updatePopoverPosition();
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, updatePopoverPosition]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        month: "long",
        year: "numeric",
      }).format(viewMonth),
    [tag, viewMonth],
  );

  const displayValue = selectedDate
    ? new Intl.DateTimeFormat(tag, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(selectedDate)
    : copy.placeholder;

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(tag, { weekday: "short" });

    return Array.from({ length: 7 }, (_, index) =>
      formatter.format(new Date(2026, 2, 1 + ((index + WEEK_START) % 7), 12)),
    );
  }, [tag]);

  const monthOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(tag, { month: "long" });
    return Array.from({ length: 12 }, (_, month) => ({
      value: month,
      label: formatter.format(new Date(2026, month, 1, 12)),
    }));
  }, [tag]);

  const yearOptions = useMemo(() => {
    const currentYear = today.getFullYear();
    const firstYear = Math.min(currentYear - 130, viewMonth.getFullYear());
    const lastYear = currentYear;
    return Array.from(
      { length: lastYear - firstYear + 1 },
      (_, index) => lastYear - index,
    );
  }, [today, viewMonth]);

  const cells = useMemo<CalendarCell[]>(() => {
    const monthStart = startOfMonth(viewMonth);
    const gridStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      1 - ((monthStart.getDay() - WEEK_START + 7) % 7),
      12,
    );

    return Array.from({ length: 42 }, (_, index) => {
      const cellDate = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
        12,
      );

      return {
        iso: toIsoDate(cellDate),
        label: new Intl.DateTimeFormat(tag, { day: "numeric" }).format(
          cellDate,
        ),
        isCurrentMonth: cellDate.getMonth() === viewMonth.getMonth(),
        isSelected: isSameDay(cellDate, selectedDate),
        isToday: isSameDay(cellDate, today),
      };
    });
  }, [selectedDate, tag, today, viewMonth]);

  function closePicker() {
    setIsOpen(false);
    onClose?.();
  }

  function togglePicker() {
    if (disabled) return;

    if (isOpen) {
      closePicker();
      return;
    }

    setPopoverStyle(null);
    setViewMonth(startOfMonth(selectedDate ?? today));
    setIsOpen(true);
    onOpen?.();
  }

  function selectDate(iso: string) {
    onChange(iso);
    closePicker();
  }

  function goToMonth(offset: number) {
    setViewMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1, 12),
    );
  }

  function selectMonth(month: number) {
    setViewMonth(
      (current) => new Date(current.getFullYear(), month, 1, 12),
    );
  }

  function selectYear(year: number) {
    setViewMonth((current) => new Date(year, current.getMonth(), 1, 12));
  }

  function clearValue() {
    if (required) return;

    onChange("");
    closePicker();
  }

  function selectToday() {
    const next = new Date();
    onChange(toIsoDate(next));
    setViewMonth(startOfMonth(next));
    closePicker();
  }

  return (
    <div
      ref={rootRef}
      className={`pdp-root pdp-root--${variant} ${locale === "ar" ? "pdp-root--rtl" : ""}`}
    >
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className={`pdp-trigger ${isOpen ? "is-open" : ""}`}
        onClick={togglePicker}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className="pdp-trigger-copy">
          <span className="pdp-trigger-month">{monthLabel}</span>
          <span
            className={`pdp-trigger-value ${selectedDate ? "" : "is-placeholder"}`}
          >
            {displayValue}
          </span>
        </span>
        <span className="pdp-trigger-icon" aria-hidden="true">
          <Icon name="calendar" size={17} strokeWidth={1.9} />
        </span>
        {variant === "line" ? <span className="pdp-trigger-line" /> : null}
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              className="pdp-popover"
              role="dialog"
              aria-label={label}
              style={
                popoverStyle
                  ? {
                      top: `${popoverStyle.top}px`,
                      left: `${popoverStyle.left}px`,
                      width: `${popoverStyle.width}px`,
                    }
                  : { visibility: "hidden" }
              }
            >
          <div className="pdp-popover-shell">
            <div className="pdp-head">
              <button
                type="button"
                className="pdp-nav"
                onClick={() => goToMonth(-1)}
                aria-label={copy.previousMonth}
              >
                {locale === "ar" ? ">" : "<"}
              </button>

              <div className="pdp-head-copy">
                <span className="pdp-head-kicker">{label}</span>
                <div className="pdp-head-selects">
                  <select
                    className="pdp-head-select"
                    aria-label={locale === "ar" ? "اختر الشهر" : "Choose month"}
                    value={viewMonth.getMonth()}
                    onChange={(event) => selectMonth(Number(event.target.value))}
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="pdp-head-select pdp-head-select--year"
                    aria-label={locale === "ar" ? "اختر السنة" : "Choose year"}
                    value={viewMonth.getFullYear()}
                    onChange={(event) => selectYear(Number(event.target.value))}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="pdp-nav"
                onClick={() => goToMonth(1)}
                aria-label={copy.nextMonth}
                disabled={
                  viewMonth.getFullYear() >= today.getFullYear() &&
                  viewMonth.getMonth() === 11
                }
              >
                {locale === "ar" ? "<" : ">"}
              </button>
            </div>

            <div className="pdp-weekdays">
              {weekdayLabels.map((weekday) => (
                <span key={weekday} className="pdp-weekday">
                  {weekday}
                </span>
              ))}
            </div>

            <div className="pdp-grid">
              {cells.map((cell) => (
                <button
                  key={cell.iso}
                  type="button"
                  className={`pdp-day ${cell.isCurrentMonth ? "" : "is-outside"} ${cell.isSelected ? "is-selected" : ""} ${cell.isToday ? "is-today" : ""}`}
                  onClick={() => selectDate(cell.iso)}
                >
                  {cell.label}
                </button>
              ))}
            </div>

            <div className="pdp-footer">
              <button
                type="button"
                className="pdp-footer-btn pdp-footer-btn--soft"
                onClick={clearValue}
                disabled={required || !value}
              >
                {copy.clear}
              </button>
              <button
                type="button"
                className="pdp-footer-btn pdp-footer-btn--primary"
                onClick={selectToday}
              >
                {copy.today}
              </button>
            </div>
          </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
