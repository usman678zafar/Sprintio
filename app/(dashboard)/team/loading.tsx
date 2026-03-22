export default function TeamLoading() {
  return (
    <div className="min-h-full bg-base px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1040px] animate-pulse">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="h-10 w-72 rounded-2xl bg-surface" />
            <div className="h-5 w-80 max-w-full rounded-xl bg-surface" />
          </div>
          <div className="h-11 w-48 rounded-2xl bg-surface" />
        </section>

        <section className="mt-10 overflow-hidden rounded-[24px] border border-border-subtle bg-surface">
          <div className="hidden bg-base px-6 py-4 lg:grid lg:grid-cols-[minmax(0,1.8fr)_220px_minmax(0,2fr)_120px]">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-4 w-24 rounded-lg bg-surface" />
            ))}
          </div>

          <div className="space-y-0">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="border-t border-border-subtle px-6 py-5">
                <div className="hidden items-center lg:grid lg:grid-cols-[minmax(0,1.8fr)_220px_minmax(0,2fr)_120px] lg:gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-base" />
                    <div className="space-y-2">
                      <div className="h-5 w-36 rounded-lg bg-base" />
                      <div className="h-4 w-44 rounded-lg bg-base" />
                    </div>
                  </div>
                  <div className="h-8 w-24 rounded-full bg-base" />
                  <div className="flex gap-2">
                    <div className="h-8 w-24 rounded-xl bg-base" />
                    <div className="h-8 w-24 rounded-xl bg-base" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <div className="h-10 w-10 rounded-xl bg-base" />
                    <div className="h-10 w-10 rounded-xl bg-base" />
                  </div>
                </div>

                <div className="space-y-4 lg:hidden">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-base" />
                    <div className="space-y-2">
                      <div className="h-5 w-36 rounded-lg bg-base" />
                      <div className="h-4 w-44 rounded-lg bg-base" />
                    </div>
                  </div>
                  <div className="h-8 w-24 rounded-full bg-base" />
                  <div className="flex gap-2">
                    <div className="h-8 w-24 rounded-xl bg-base" />
                    <div className="h-8 w-24 rounded-xl bg-base" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
