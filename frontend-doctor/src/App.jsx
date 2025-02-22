import { Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import Home from './components/Home/Home';
import Dashboard from './components/Dashboard/Dashboard';
import Chatbot from './components/Chatbot/Chatbot';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/dashboard"
        element={
          <>
            <SignedIn>
              <Dashboard />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      />
      <Route path="/chat" element = {<SignedIn>{<Chatbot />}</SignedIn> } />
    </Routes>
  );
}

export default App;