import "./SkeletonLoader.css";

export function StationSkeleton() {
  return (
    <div className="mm-skeleton-stations" role="status" aria-label="Loading station selectors">
      <div className="mm-skeleton-field"><span className="mm-shimmer mm-skeleton-label" /><span className="mm-shimmer mm-skeleton-input" /></div>
      <span className="mm-shimmer mm-skeleton-swap" />
      <div className="mm-skeleton-field"><span className="mm-shimmer mm-skeleton-label" /><span className="mm-shimmer mm-skeleton-input" /></div>
    </div>
  );
}

export function RouteSkeleton() {
  return (
    <div className="mm-skeleton-results" role="status" aria-label="Comparing metro routes">
      <span className="mm-shimmer mm-skeleton-title" />
      <div className="mm-skeleton-cards">
        {[0, 1, 2].map((item) => <div className="mm-skeleton-card" key={item}>
          <span className="mm-shimmer mm-skeleton-label" />
          <span className="mm-shimmer mm-skeleton-number" />
          <span className="mm-shimmer mm-skeleton-line" />
        </div>)}
      </div>
      <div className="mm-skeleton-card"><span className="mm-shimmer mm-skeleton-title" /><span className="mm-shimmer mm-skeleton-line" /><span className="mm-shimmer mm-skeleton-line" /></div>
    </div>
  );
}
