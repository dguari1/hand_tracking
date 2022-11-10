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
    if (n==0) {
        return 0
    } else {
    const mean = array.reduce((a, b) => a + b) / n
    n = n - 1
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)}
  }