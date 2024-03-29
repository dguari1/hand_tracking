// import logo from './hand-pointer-regular.svg';
import './App.css';
import { useState, useEffect } from "react";

import { slide as Menu } from 'react-burger-menu'
import {TbCamera, TbHandClick, TbHome2, TbQuestionMark} from 'react-icons/tb';
import "./style_menu.css";

import {Home} from "./Home";
import WebCamRecord from "./WebCamRecord";
import VideoLoadScreen from './VideoLoadScreen';
import ShowResults from './ShowResults.js'
import DataAnalysis from './DataAnalysis';

function App() {

  useEffect(() => {
    document.title = 'Hand Tracking'
}, []);


  const [showHome, setShowHome] = useState(true);
  const [showRecord, setShowRecord] = useState(false);
  const [showVideoAnalysis, setShowVideoAnalysis] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showDataAnalysis, setShowDataAnalysis] = useState(false)

  const [isOpen, setOpen] = useState(false)

  const handleIsOpen = () => {
    setOpen(!isOpen)
  }

  const closeSideBar = () => {
    setOpen(false)
  }


  function handleClick(event) {
    switch (event.target.id) {
      case 'home':
        setShowHome(true);
        setShowRecord(false);
        setShowVideoAnalysis(false);
        setShowAbout(false);
        setShowDataAnalysis(false)
        closeSideBar()
        break;
      case 'record':
        setShowHome(false);
        setShowRecord(true);
        setShowVideoAnalysis(false);
        setShowAbout(false);
        setShowDataAnalysis(false)
        closeSideBar()
        break;
      case 'videoanalysis':
        setShowHome(false);
        setShowRecord(false);
        setShowVideoAnalysis(true);
        setShowAbout(false);
        setShowDataAnalysis(false)
        closeSideBar()
        break;
      case 'about':
        setShowHome(false);
        setShowRecord(false);
        setShowVideoAnalysis(false);
        setShowAbout(true);
        setShowDataAnalysis(false)
        closeSideBar()
        break;
      case 'dataanalysis': 
        setShowHome(false);
        setShowRecord(false);
        setShowVideoAnalysis(false);
        setShowAbout(false);
        setShowDataAnalysis(true)
        closeSideBar()
        break;
      case 'documentation':
        window.open("https://dguari1.github.io/hand_tracking_documentation/");
        break
      default:
        break;
    }
  }

  return (<>

<Menu width={300}
      disableCloseOnEsc
      isOpen={isOpen}
      onOpen={handleIsOpen}
      onClose={handleIsOpen}>

        <a id="home" className="menu-item" onClick={handleClick}>Home</a>
        <a id="record" className="menu-item" onClick={handleClick}>Record</a>
        <a id="videoanalysis" className="menu-item" onClick={handleClick}>Video Analysis</a>
        <a id="documentation" className="menu-item" onClick={handleClick}>Documentation</a>
        <a id="dataanalysis" className="menu-item" onClick={handleClick}>Data Analysis</a>
        <a id="about" className="menu-item--small" onClick={handleClick}>About</a>
  </Menu>

  { showHome ? <Home /> : null }
  { showRecord ? <WebCamRecord /> : null }
  { showVideoAnalysis ? <VideoLoadScreen /> : null }
  { showAbout ? <ShowResults /> : null}
  {showDataAnalysis ? <DataAnalysis /> : null}

  </>
);
}

export default App;
