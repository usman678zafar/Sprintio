import MobileSidebar from "./MobileSidebar";

export default function Navbar({ user }: { user: any }) {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar />
        <div className="font-medium text-gray-800">
          Dashboard
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
        <span className="text-sm font-medium text-gray-600 hidden sm:block">
          {user?.name}
        </span>
      </div>
    </header>
  );
}
