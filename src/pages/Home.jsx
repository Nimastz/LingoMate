import React from 'react'
import {Chat} from './Chat'
import {Sidebar} from './Sidebar'
export const Home = () => {
  return (
    <div className="home">
      <div className="container">
      <Sidebar/>
      <Chat/>
      </div>
    </div>
  )
}

export default Home