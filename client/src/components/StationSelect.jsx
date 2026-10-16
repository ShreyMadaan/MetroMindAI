
import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronDown,
  MapPin,
  Search,
  X,
} from "lucide-react";

export default function StationSelect({
  label,
  stations = [],
  value,
  onChange,
  placeholder = "Search metro stations...",
  disabled = false,
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const listboxId = useId();

  const selectedStation = stations.find(
    (station) => station.code === value
  );

  // Keep input synchronized with the selected station.
  useEffect(() => {
    if (selectedStation) {
      setQuery(selectedStation.name);
      setDebouncedQuery(selectedStation.name);
    } else if (value) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [value, selectedStation?.name]);

  // Debounce the search input.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const filteredStations = stations
    .filter((station) => {
      const search = debouncedQuery.trim().toLowerCase();

      if (!search) return true;

      return (
        station.name.toLowerCase().includes(search) ||
        station.code.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const closeDropdown = () => {
    setIsOpen(false);
    setActiveIndex(-1);

    // Restore the selected station's name if the
    // user leaves an unfinished search.
    setQuery(selectedStation?.name || "");
  };

  // Close when clicking outside.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  });

  const handleSelect = (station) => {
    onChange(station.code);
    setQuery(station.name);
    setDebouncedQuery(station.name);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleInputChange = (event) => {
    const nextQuery = event.target.value;

    setQuery(nextQuery);
    setActiveIndex(-1);
    setIsOpen(true);

    // Clear the previously selected station
    // when the user starts a new search.
    if (value) {
      onChange("");
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      closeDropdown();
      inputRef.current?.blur();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setIsOpen(true);

      setActiveIndex((previous) =>
        Math.min(
          previous + 1,
          filteredStations.length - 1
        )
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveIndex((previous) =>
        Math.max(previous - 1, 0)
      );
    }

    if (event.key === "Enter" && isOpen) {
      if (activeIndex >= 0 && filteredStations[activeIndex]) {
        event.preventDefault();
        handleSelect(filteredStations[activeIndex]);
      } else if (filteredStations.length === 1) {
        event.preventDefault();
        handleSelect(filteredStations[0]);
      }
    }
  };

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setActiveIndex(-1);
    onChange("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div
      className="station-select"
      ref={containerRef}
    >
      <label className="field-label">
        {label}
      </label>

      <div className="station-input-wrapper">
        <Search size={18} className="input-icon" />

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          onFocus={() => {
            // Show all stations when a selected
            // station isn't being actively searched.
            setDebouncedQuery("");
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onClick={() => {
            setDebouncedQuery("");
            setIsOpen(true);
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />

        <div className="station-input-actions">
          {query && (
            <button
              type="button"
              className="station-clear-button"
              onClick={handleClear}
              aria-label={`Clear ${label}`}
            >
              <X size={16} />
            </button>
          )}

          <button
            type="button"
            className="station-chevron-button"
            aria-label={`Toggle ${label} stations`}
            aria-expanded={isOpen}
            onClick={() => {
              setDebouncedQuery("");
              setIsOpen((previous) => !previous);
              inputRef.current?.focus();
            }}
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <div
          className="station-dropdown"
          id={listboxId}
          role="listbox"
          aria-label={`${label} options`}
        >
          <div className="station-dropdown-header">
            <span>AVAILABLE STATIONS</span>
            <span>{filteredStations.length}</span>
          </div>

          {filteredStations.length > 0 ? (
            filteredStations.map((station, index) => (
              <button
                key={station._id || station.code}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={
                  station.code === value
                }
                className={`station-option ${
                  activeIndex === index
                    ? "station-option-active"
                    : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => handleSelect(station)}
              >
                <MapPin size={16} />

                <span className="station-option-name">
                  {station.name}
                </span>

                {station.isInterchange && (
                  <span className="interchange-tag">
                    Interchange
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="dropdown-empty">
              {stations.length === 0
                ? "No stations available. Check the backend connection."
                : "No matching stations found."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
