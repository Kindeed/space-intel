export function SkeletonFeed() {
  return (
    <div className="page-list" aria-label="正在加载">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <span />
          <strong />
          <p />
        </div>
      ))}
    </div>
  );
}
