// function to compute the average of an array of numbers  
export function average(array) {
    return array.reduce((a, b) => a + b) / array.length;
}

// function to compute the average of an array of numbers  
export function computeRMS(arr) {
    return Math.sqrt(arr.map( val => (val * val)).reduce((acum, val) => acum + val)/arr.length);
}

// function to compute the sum of squares of an array of numbers
export function sumofSquares(arr) {
    return arr.map( val => (val * val)).reduce((acum, val) => acum + val)/arr.length
}

// function to divide an array by a number
export function dividebyValue(arr, value) {
    return arr.map(val => (val/value))
}

export function getStandardDeviation (array) {
    var n = array.length
    if (n===0) {
        return 0
    } else {
    const mean = array.reduce((a, b) => a + b) / n
    n = n - 1
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)}
  }
//taken from https://github.com/rochars/low-pass-filter
  export function lowPassFilter(samples, cutoff, sampleRate, numChannels) {
    let rc = 1.0 / (cutoff * 2 * Math.PI);
    let dt = 1.0 / sampleRate;
    let alpha = dt / (rc + dt);
    let last_val = [];
    let offset;
    for (let i=0; i<numChannels; i++) {
        last_val[i] = samples[i];
    }
    for (let i=0; i<samples.length; i++) {
        for (let j=0; j< numChannels; j++) {
            offset = (i * numChannels) + j;
            last_val[j] =
                last_val[j] + (alpha * (samples[offset] - last_val[j]));
            samples[offset] = last_val[j];
        }
    }
}

export function difftoNumber(array, number) {
    return array.map(x => x-number).reduce((a, b) => a + b) / array.length
}