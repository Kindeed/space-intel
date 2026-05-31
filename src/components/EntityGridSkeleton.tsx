type EntityGridSkeletonProps = {
  label: string;
};

export function EntityGridSkeleton({ label }: EntityGridSkeletonProps) {
  return (
    <div className="card-grid__loading" aria-label={label}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="entity-card entity-card--skeleton" key={index}>
          <strong />
          <span />
          <em />
        </div>
      ))}
    </div>
  );
}
