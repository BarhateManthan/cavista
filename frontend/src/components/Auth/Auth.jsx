import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

export default function Auth() {
  return (
    <header>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="button-primary">Sign In</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </header>
  );
}