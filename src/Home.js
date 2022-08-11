import { useState, createRef, useEffect } from "react";
import classNames from 'classnames';
import './Home.css';


export function Home() {



  return (
    <div id="outer-container" style={{ height: '100%' }}>
    <main id="page-wrap">

    <h1>
        Hand Tracking Tool
    </h1>
    <div className='home-container'>
        <h2 className="description">
                User can record and process short videos of hand movements to identify signs of bradykinesia.
                <br/><br/>
                Hand videos are processed to localize and track the movement of the thumb and index fingers.
        </h2>
    </div>

    </main>
  </div>
  )
    
}

//export default Home;
