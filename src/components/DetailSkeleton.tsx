type DetailSkeletonProps = {
  label: string;
};

export function DetailSkeleton({ label }: DetailSkeletonProps) {
  return (
    <section className="detail-panel detail-panel--skeleton" aria-label={label}>
      <div className="metadata-grid metadata-grid--skeleton">
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
      <strong />
      <p />
      <p />
    </section>
  );
}
