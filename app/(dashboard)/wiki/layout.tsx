import WikiExplorerSidebar from "@/components/wiki/WikiExplorerSidebar";

export default function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <WikiExplorerSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
