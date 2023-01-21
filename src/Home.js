import { useState, createRef, useEffect } from "react";
import classNames from 'classnames';
import './Home.css';


export function Home() {



  return (
    <div className="outer-container">
    <main id="page-wrap">

    <h1>
        Hand Tracking Tool
    </h1>
    <div className='home-container'>
        <h2 className="description">
                User can record and process short videos of hand movements to identify signs of bradykinesia.
                <br/><br/>
                Hand videos are processed to localize and track the movement of the thumb and index fingers during the Finger Tapping Test. Movement signals are used to identify signs of bradykinesia.
        </h2>
    </div>

    
    </main>
    {/* <center>
    <div style={{margin: 'auto auto'}}> 
    <a href="https://dguari1.github.io/hand_tracking_documentation/">Documentation</a> | <a href="mailto: d.guarinlopez@ufl.edu">Contact</a>
    </div> 
     </center>*/}
    <div className="navbar" id="myNavbar">
      <a href="https://dguari1.github.io/hand_tracking_documentation/">Documentation</a>
      <a href="mailto: d.guarinlopez@ufl.edu">Contact</a>
    </div>

   

  </div>
  )
    
}

//export default Home;
