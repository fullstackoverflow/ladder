import { lazy, Suspense } from 'react';
import type { ComponentProps } from 'react';
import { LoaderCircle } from 'lucide-react';
const LazyEditor = lazy(() =>
  import('./CodeEditor').then((module) => ({ default: module.CodeEditor })),
);
export function Editor(props: ComponentProps<typeof LazyEditor>) {
  return (
    <Suspense
      fallback={
        <div className="loading-state">
          <LoaderCircle size={20} className="spin" />
          正在加载编辑器…
        </div>
      }
    >
      <LazyEditor {...props} />
    </Suspense>
  );
}
