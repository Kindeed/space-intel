import type { SourceCollector, SourceConfig, SourceType } from './types';

export class CollectorRegistry {
  private readonly collectors = new Map<SourceType, SourceCollector>();

  register(collector: SourceCollector): void {
    if (this.collectors.has(collector.type)) {
      throw new Error(`Collector already registered for type: ${collector.type}`);
    }

    this.collectors.set(collector.type, collector);
  }

  get(source: SourceConfig): SourceCollector {
    const collector = this.collectors.get(source.type);

    if (!collector) {
      throw new Error(`No collector registered for source type: ${source.type}`);
    }

    return collector;
  }

  supportedTypes(): SourceType[] {
    return [...this.collectors.keys()];
  }
}

export function createCollectorRegistry(collectors: SourceCollector[]): CollectorRegistry {
  const registry = new CollectorRegistry();

  for (const collector of collectors) {
    registry.register(collector);
  }

  return registry;
}
