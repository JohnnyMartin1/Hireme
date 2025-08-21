export default function HomePage() {
  return (
    <main className="flex items-center justify-center h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">HireMe</h1>
        <p className="text-lg text-gray-600">Find your next opportunity or the perfect candidate.</p>
        <div className="space-x-4">
          <a href="/auth/signup" className="px-4 py-2 bg-blue-600 text-white rounded-md">Sign up</a>
          <a href="/auth/login" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md">Log in</a>
        </div>
      </div>
    </main>
  );
}