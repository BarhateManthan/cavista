import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Auth from './Auth'
import Home from './components/Home/Home'
import Auth  from './Auth'
import DriveFolderDownloader from './components/DriveFolderDownloader'

function App() {
  return (
    <>
      <Home />
      {/* <Auth /> */}
      <div className="p-4">
      {/* <DriveFolderDownloader /> */}
    </div>
    </>
  )
}
export default App;