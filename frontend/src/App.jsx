import { Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/clerk-react";
import Home from './components/Home/Home';
import { handleDriveSelect } from './lib/apis/gdrive';

function DownloadButton() {
  const { user } = useUser();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {user && (
        <button
          onClick={handleDriveSelect}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          📁 Download from Drive
        </button>
      )}
    </div>
  );
}

function App() {
  return (
    <div className="relative min-h-screen">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/dashboard"
          element={
            <>
              <SignedIn>
                <Home />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
      </Routes>
      <DownloadButton />
    </div>
  );
}

export default App;