import React, { Component, createRef, useState, useEffect, useMemo, useCallback } from "react";

import  "./ShowResults.css";
import Plot from 'react-plotly.js'

import {find_local_maxima, filter_by_distance} from './findpeaks.js'

// const fs = require('fs');

import data from "./T008_1039_1_20220906_T008_1039_1_20220906_1037-peaks_new.json"

// const slayer = require('slayer');

class ShowResults extends Component {
    constructor(props) {
        super(props);
        this.state = {
            videoWidth : '50%',
            mouseDown : false,
            rectangle : null,
            cancelled : false,
            revision : 0
        }

        this.canvasRef = createRef();
        this.sliderLeftRef = createRef();
        this.sliderRightRef = createRef();
        this.plotLet = createRef();
        this.plotRight = createRef();
        this.labelLeft = createRef();
        this.labelRight = createRef();

        this.data = data.peaks
        this.dataLeft = data.peaks;
        this.dataRight = data.peaks;
        this.frameRate = 60;
        this.leftHigh = {}
        this.leftLow = {}
        this.rightHigh = {}
        this.rightLow = {}

    }


    componentDidMount = () => {
        // set labels 
        this.labelLeft.current.innerHTML = this.sliderLeftRef.current.value + 's'
        this.labelRight.current.innerHTML = this.sliderRightRef.current.value + 's'

        
        this.handeFindPeaksinData()
    }

    handeFindPeaksinData = () => {

        //left High 
        this.leftHigh = this.getPeaksIndexandValues(this.dataLeft, this.sliderLeftRef.current.value*this.frameRate)
        this.leftLow = this.getPeaksIndexandValuesNeg(this.dataLeft, this.sliderLeftRef.current.value*this.frameRate)
        this.rightHigh  = this.getPeaksIndexandValues(this.dataRight, this.sliderRightRef.current.value*this.frameRate)
        this.rightLow = this.getPeaksIndexandValuesNeg(this.dataRight, this.sliderRightRef.current.value*this.frameRate)

        this.setState({revision : this.state.revision + 1})
        
        console.log(this.leftHigh.peaksIndex, this.leftLow.peaksIndex)

    }

    getPeaksIndexandValues = (data, distance) => {
        let peaksIndex = filter_by_distance(find_local_maxima(data), data, distance)
        let peaksValues = peaksIndex.map(i => data[i])
        return {peaksIndex, peaksValues}
    }

    getPeaksIndexandValuesNeg = (data, distance) => {
        let dataNeg = data.map(val => (-1*val))
        let peaksIndex = filter_by_distance(find_local_maxima(dataNeg), dataNeg, distance)
        let peaksValues = peaksIndex.map(i => data[i])
        return {peaksIndex, peaksValues}
    }

    handleSliderChange = (event) =>{
        if (event.target.className === 'interact-slider-left'){
            this.leftHigh = this.getPeaksIndexandValues(this.dataLeft, event.target.value*this.frameRate)
            this.leftLow = this.getPeaksIndexandValuesNeg(this.dataLeft, event.target.value*this.frameRate)
            this.labelLeft.current.innerHTML = event.target.value + 's'
            
        } else {
            this.rightHigh  = this.getPeaksIndexandValues(this.dataRight, event.target.value*this.frameRate)
            this.rightLow = this.getPeaksIndexandValuesNeg(this.dataRight, event.target.value*this.frameRate)
            this.labelRight.current.innerHTML = event.target.value + 's'
        }

        this.setState({revision : this.state.revision + 1})

        
    }

    render () {
        return(

            <div className="container">
            <center>
            <hr className="topLine"/>


            <div className="plotRight">

             <div className="sliderPlot"  >
                <label className="interact-label" style={{float: "left"}}>Minimum distance</label> 
                <label className='interact-slider-value' ref={this.labelRight} style={{float: "right"}}> 0.1s </label>
                <br/>
                <input className="interact-slider-right" type="range" min="0" max="3" step="0.05" defaultValue="0.1" id="slider" ref={this.sliderRightRef} onChange={this.handleSliderChange}  />
            </div>

            <Plot ref={this.plotRight} data ={[
                {
                y : this.dataRight,
                name: 'Right Hand',
                type : 'scatter',
                mode : 'lines',
                marker : {color:'#62BBC1'}
                },
                {
                y : this.rightHigh.peaksValues,
                x : this.rightHigh.peaksIndex,
                name: 'Left Hand Peaks',
                type:'scatter',
                mode:'markers',
                marker : {  size: 10,
                            color:'red'}
                },
                {
                y : this.rightLow.peaksValues,
                x : this.rightLow.peaksIndex,
                name: 'Left Hand Peaks',
                type:'scatter',
                mode:'markers',
                marker : {  size: 10,
                            color:'red'}
                }
                
            ]}
            layout = {{height: 400, xaxis : {title: 'Time [s]'}, yaxis : {title: 'Distance [cm]'}, title: 'Right Hand', font: {
        family: 'Verdana, Geneva, sans-serif;',
        size: 16,
        color: '#7f7f7f'
      },showlegend: false}} 
        revision = {this.state.revision}
        config = {{responsive : true}}
        onClick={() => console.log("onClick")}
      />
      </div>
      <br/>
      <div className="plotRight">
        <div className="sliderPlot"  >
                <label className="interact-label" style={{float: "left"}}>Minimum distance</label> 
                <label className='interact-slider-value' ref={this.labelLeft} style={{float: "right"}}> 0.1s </label>
                <br/>
                <input className="interact-slider-left" type="range" min="0" max="3" step="0.05" defaultValue="0.1" id="slider" ref={this.sliderLeftRef} onChange={this.handleSliderChange}  />
            </div>
        <Plot ref={this.plotLeft} data ={[
                {
                y : this.dataLeft,
                name: 'Left Hand',
                type : 'scatter',
                mode : 'lines',
                marker : {color:'#62BBC1'}
                },
                {
                y : this.leftHigh.peaksValues,
                x : this.leftHigh.peaksIndex,
                name: 'Left Hand Peaks',
                type:'scatter',
                mode:'markers',
                marker : {  size: 10,
                            color:'red'}
                },
                {
                y : this.leftLow.peaksValues,
                x : this.leftLow.peaksIndex,
                name: 'Left Hand Peaks',
                type:'scatter',
                mode:'markers',
                marker : {  size: 10,
                            color:'red'}
                }
            ]}
            layout = {{height: 400, xaxis : {title: 'Time [s]'}, yaxis : {title: 'Distance [cm]'}, title: 'Left Hand', font: {
        family: 'Verdana, Geneva, sans-serif;',
        size: 16,
        color: '#7f7f7f'
      },
      showlegend: false}} 
      revision = {this.state.revision}
      config = {{responsive : true}}
      onClick={() => console.log("onClick")}
      />



            </div>

            
            <div className="process-button">


            {/* <div className="slider" >
                <label className="interact-label" style={{float: "left"}}>Minimum distance</label> 
                <label className='interact-slider-value' style={{float: "right"}}> 0.5 </label>
                <br/>
                <input className="interact-slider" type="range" min="0" max="10" defaultValue="0" id="slider" ref={this.sliderRef} onChange={this.handleSliderChange}  />
            </div> */}

                    <button style = {{ width:'45%', minWidth:'250px'}}  type="button" value='processVideo' ref={this.processVideoButtonTag} onClick={this.handleClick} disabled={false}>Save Landmakrs</button>
                    <button style = {{ width:'45%', minWidth:'250px'}}  type="button" value='processVideo' ref={this.processVideoButtonTag} onClick={this.handleClick} disabled={false}>Save Signals</button>

            </div>

            
              </center>
            </div>

            

        );
    }
}

export default ShowResults;