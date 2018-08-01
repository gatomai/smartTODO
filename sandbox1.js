// function doThingWhenYouCan(x) {
//   debugger;
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       debugger;
//       resolve(x * 2);
//     }, 2000);
//   });
// }

// const promise = doThingWhenYouCan(2);
// debugger;

// promise.then((resolveValue) => {
//   debugger;
// });
// debugger;

function recipe() {
  debugger;
  return (2 * 2);
}

function print4after2seconds() {
  debugger;
  return setTimeout(recipe, 2000);
}

const retVal = print4after2seconds()
debugger;

// const toLog = doubleAfter2Seconds(2)
// console.log(toLog);

// function doubleEverything() {
//   return [1,2,3].map((num) => {
//     return num * 2;
//   });
// }
