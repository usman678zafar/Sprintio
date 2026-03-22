export default function DashboardLoading() {
  return (
    <div className="min-h-full bg-[#f6f8fc] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1160px] space-y-6 animate-pulse">
        <div className="h-8 w-56 rounded-xl bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-32 rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]" />
          <div className="h-32 rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]" />
          <div className="h-32 rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]" />
        </div>
        <div className="h-14 w-full rounded-2xl bg-white" />
        <div className="space-y-4">
          <div className="h-28 w-full rounded-3xl bg-white" />
          <div className="h-28 w-full rounded-3xl bg-white" />
          <div className="h-28 w-full rounded-3xl bg-white" />
        </div>
      </div>
    </div>
  );
}
