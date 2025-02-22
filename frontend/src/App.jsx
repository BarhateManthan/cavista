import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Auth  from './Auth'
import DriveFolderSelector from './components/DriveFolderSelector';

function App() {
  return (
    <>
      {/* <Auth /> */}
      <div className="p-4">
      <DriveFolderSelector />
    </div>
    </>
  )
}
export default App;