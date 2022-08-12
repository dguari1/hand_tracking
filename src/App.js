import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from "react";

import { slide as Menu } from 'react-burger-menu'
import {TbCamera, TbHandClick, TbHome2, TbQuestionMark} from 'react-icons/tb';
import "./style_menu.css";

import {Home} from "./Home";
import WebCamRecord from "./WebCamRecord";

function App() {



  const [showHome, setShowHome] = useState(true);
  const [showRecord, setShowRecord] = useState(false);
  const [showHandTracking, setShowHandTracking] = useState(true);
  const [showAbout, setShowAbout] = useState(true);


  useEffect(() => {
    setShowHome(true);
    setShowRecord(false);
    setShowHandTracking(false);
    setShowAbout(false);

    var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    var isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
    console.log(isChrome, isSafari);
  } , []);


  function handleClick(event) {
    console.log(event.target.id)
    switch (event.target.id) {
      case 'home':
        setShowHome(true);
        setShowRecord(false);
        setShowHandTracking(false);
        setShowAbout(false);
        break;
      case 'record':
        setShowHome(false);
        setShowRecord(true);
        setShowHandTracking(false);
        setShowAbout(false);
        break;
      case 'handTracking':
        setShowHome(false);
        setShowRecord(false);
        setShowHandTracking(true);
        setShowAbout(false);
        break;
      case 'about':
        setShowHome(false);
        setShowRecord(false);
        setShowHandTracking(false);
        setShowAbout(true);
        break;
      default:
        break;
    }
  }

  return (<>

<Menu width={300}
      disableCloseOnEsc>

        <a id="home" className="menu-item" onClick={handleClick}>Home</a>
        <a id="record" className="menu-item" onClick={handleClick}>Record</a>
        <a id="handtracking" className="menu-item" href="/contact">Hand Tracking</a>
        <a id="about" className="menu-item--small" href="">About</a>
  </Menu>

  { showHome ? <Home /> : null }
  { showRecord ? <WebCamRecord /> : null }
  </>
);
}

export default App;
