<template lang="pug">
.lds-default
  div
  div
  div
  div
  div
  div
  div
  div
  div
  div
  div
  div
</template>

<style lang="scss">
.lds-default {
  display: inline-block;
  position: relative;
  width: 8.0em;
  height: 8.0em;
}
.lds-default div {
  position: absolute;
  width: .6em;
  height: .6em;
  background: #fff;
  border-radius: 50%;
  animation: lds-default 1.2s linear infinite;
}
.lds-default div:nth-child(1) {
  animation-delay: 0s;
  top: 3.7em;
  left: 6.6em;
}
.lds-default div:nth-child(2) {
  animation-delay: -0.1s;
  top: 2.2em;
  left: 6.2em;
}
.lds-default div:nth-child(3) {
  animation-delay: -0.2s;
  top: 1.1em;
  left: 5.2em;
}
.lds-default div:nth-child(4) {
  animation-delay: -0.3s;
  top: .7em;
  left: 3.7em;
}
.lds-default div:nth-child(5) {
  animation-delay: -0.4s;
  top: 1.1em;
  left: 2.2em;
}
.lds-default div:nth-child(6) {
  animation-delay: -0.5s;
  top: 2.2em;
  left: 1.1em;
}
.lds-default div:nth-child(7) {
  animation-delay: -0.6s;
  top: 3.7em;
  left: .7em;
}
.lds-default div:nth-child(8) {
  animation-delay: -0.7s;
  top: 5.2em;
  left: 1.1em;
}
.lds-default div:nth-child(9) {
  animation-delay: -0.8s;
  top: 6.2em;
  left: 2.2em;
}
.lds-default div:nth-child(10) {
  animation-delay: -0.9s;
  top: 6.6em;
  left: 3.7em;
}
.lds-default div:nth-child(11) {
  animation-delay: -1s;
  top: 6.2em;
  left: 5.2em;
}
.lds-default div:nth-child(12) {
  animation-delay: -1.1s;
  top: 5.2em;
  left: 6.2em;
}
@keyframes lds-default {
  0%, 20%, 80%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.5);
  }
}
</style>
