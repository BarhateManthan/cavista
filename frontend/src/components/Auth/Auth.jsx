import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

export default function Auth() {
  return (
    <header>
      <SignedOut>
        <SignInButton mode="modal">
          <button>Sign In</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton/>
      </SignedIn>
    </header>
  );
}