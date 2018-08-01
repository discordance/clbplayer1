import { CreateMedia } from './media'
import { hexToRgb } from './utils'


// some constants

const DEFAULT_WIDTH = 720
const DEFAULT_HEIGHT = 64

const BAR_WIDTH = 1
const BAR_SPACE = 1
const MAX_INT16 = 32767
const POWER = 0.7 // used to have better looking ranges between the bars 

// Cloub Player Main class
export class CloubPlayer {

  // init properties
  __init () {

    // for animation farme
    this.destructed = false

    // animation time
    this.animTime = 0.0

    // sets the time to 0
    this.time = 0

    // sets the seekableDur to 0
    this.seekableDuration = 0

    // default conf
    this.config = {
      wfOnly: false,
      wfWidth: 720,
      wfHeight: 64,
      wfMainCol: '#8582c2',
      wfGreyCol: '#aaaaaa',
      wfDisabledCol: '#eeeeee',
      wfTickColor: '#333333'
    }
    this.rgbMain = hexToRgb(this.config.wfMainCol)

    // loading_state
    this.loading = false

    // register external listeners
    this.listeners = {}
  }

  // construct
  constructor(wrapperId, config) {
    
    // :}
    this.__init()

    //
    if (!wrapperId) {
      throw new Error('Player should be given a wrapper id')
    }
    this.wrapperId = wrapperId

    //
    if(!config || config.constructor.name.toLowerCase() !== 'object'){
      throw new Error('Config should be an object')
    }
    this.config = config
    this.rgbMain = hexToRgb(this.config.wfMainCol)

    // animation frame
    window.requestAnimationFrame(this._animationLoop.bind(this))
    
    // call canvas
    this._createCanvas()
  }

  // destruct
  destructor() {

    // animation frame 
    this.destructed = true

    // rm all event listeners
    this.audio.removeEventListener('loadstart', this.__loadstart.bind(this))
    this.audio.removeEventListener('play', this.__play.bind(this))
    this.audio.removeEventListener('pause', this.__pause.bind(this))
    this.audio.removeEventListener('waiting', this.__waiting.bind(this))
    this.audio.removeEventListener('abort', this.__abort.bind(this))
    this.audio.removeEventListener('canplay', this.__canplay.bind(this))
    this.audio.removeEventListener('timeupdate', this.__timeupdate.bind(this))

    //
    this.canvasEl.addEventListener('click', this.__onCanvasClick.bind(this), false)
  }

 

  setWfData(wfData){
    if(!wfData || wfData.constructor.name.toLowerCase() !== 'array'){
      throw new Error('wfData should be an array')
    }

    // remove the last zero that is a backend artifact (trailing comma)
    wfData.splice(-1,1)

    // set wfData
    this.wfData = wfData

    // triggers a draw
    this._draw()
  }

  // set the media url
  setMedia(mediaUrl, duration){
    
    if (!mediaUrl) {
      throw new Error('Player should be given a media url')
    }

    if (!duration) {
      throw new Error('Player should be given a duration')
    }

    // set
    this.mediaUrl = mediaUrl

    // set backendDuration
    this.backendDuration = duration

    // create player if doesnt exists
    if (!this.audio){
      this._createAudioPlayer()
    }
  }

  // add an external event listener
  listen(key, handler) {
    this.listeners[key] = handler
  }

  // external controls
  play(){
    if(this.audio){
      this.audio.play()
    }
  }

  // external controls
  pause(){
    if(this.audio){
      this.audio.pause()
    }
  }

  _animationLoop(){

    this.animTime += 5

    if(this.loading){
      this._drawLoading()
    }

    if(!this.destructed){
      window.requestAnimationFrame(this._animationLoop.bind(this))
    }
  }

  // create the audio player
  _createAudioPlayer() {

    // audio element
    const audio = document.createElement('audio')
    audio.id       = this.wrapperId + 'audioPlayer'
    audio.controls = null

    // add to DOM
    const wrapperEl = document.getElementById(this.wrapperId)
    wrapperEl.appendChild(audio)

    // media source extension
    CreateMedia(this.mediaUrl, audio)

    // set
    this.audio = audio

    // setups listeners
    this._setupPlayerListeners()
  }

  // create the canvas
  _createCanvas() {

    // get wrapper
    const wrapperEl = document.getElementById(this.wrapperId)

    // sort size
    let width = DEFAULT_WIDTH
    let height = DEFAULT_HEIGHT
    if(this.config.wfWidth){
      width = this.config.wfWidth
    }
    if(this.config.wfHeight){
      height = this.config.wfHeight
    }

    // set
    this.width = width
    this.height = height
    
    // actually create the canvas
    const canvasEl = document.createElement('canvas')
    canvasEl.id = this.wrapperId + '_wfCanvas'
    canvasEl.width = width
    canvasEl.height = height

    // touch and mouse events
    canvasEl.addEventListener('click', this.__onCanvasClick.bind(this), false)

    // debug
    // canvasEl.style.border = '1px solid'

    // append
    wrapperEl.appendChild(canvasEl)

    // get context to draw
    const ctx = canvasEl.getContext('2d')
    this.ctx = ctx
    this.canvasEl = canvasEl
  }

  _updateTime(newTime, duration, seekable){
    
    // sets the seekable (buffered) duration
    this.seekableDuration = seekable

    let timeRatio = newTime/duration
    if (!this.time){
      this.time = timeRatio
    }
    if (this.time != timeRatio){
      this.time = timeRatio

      // refresh
      this._draw()
    }
    // console.log('timeupdate', timeRatio)
  }

  _drawLoading(){
    // not ready ?
    if (!this.wfData){
      return
    }

    // clear
    this.ctx.clearRect(0, 0, this.width, this.height)

    // init vars
    let woffset = 0
    const totalSteps = this.width/(BAR_SPACE+BAR_WIDTH)

    const where = (this.animTime%totalSteps)/totalSteps
    
    const h2 = this.height*0.5


    // loop to draw waveform
    for (let index = 0; index < totalSteps; index++) {
      
      // ratio of index to total steps
      let idxRatio = index/totalSteps

      // dist
      let dist = 1-Math.abs(where-idxRatio)
      
      // get the waveform index retalitve to the step index
      let wfIndex = Math.floor(this.wfData.length*idxRatio)

      // get value at the index
      let stepRatio = Math.abs(this.wfData[wfIndex])/MAX_INT16
      stepRatio = Math.pow(stepRatio, POWER)*this.height
      // stepRatio *= dist

      // draw
      woffset = Math.floor(woffset)+0.5
      let yoffset = h2-stepRatio*0.5

      let col = 'rgba('+this.rgbMain.r+','+this.rgbMain.g+','+this.rgbMain.b+','+dist+')'

      this.ctx.beginPath()
      this.ctx.strokeStyle = col
      this.ctx.lineWidth = BAR_WIDTH*2
      this.ctx.moveTo(woffset, yoffset)
      this.ctx.lineTo(woffset, yoffset+stepRatio)
      this.ctx.stroke()

      // inc the offset in real pixel width
      woffset += BAR_SPACE+BAR_WIDTH
    }
  }

  _draw(){

    // not ready ?
    if (!this.wfData){
      return
    }

    // clear
    this.ctx.clearRect(0, 0, this.width, this.height)

    // init vars
    const dataLen = this.wfData.length
    let woffset = 0
    const totalSteps = this.width/(BAR_SPACE+BAR_WIDTH)

    // loop to draw waveform
    for (let index = 0; index < totalSteps; index++) {

      // ratio of index to total steps
      let idxRatio = index/totalSteps
      const seekableRatio = this.seekableDuration/this.backendDuration
     
      // get the waveform index retalitve to the step index
      let wfIndex = Math.floor(dataLen*idxRatio)

      // get value at the index
      let stepRatio = Math.abs(this.wfData[wfIndex])/MAX_INT16
      stepRatio = Math.pow(stepRatio, POWER)
      // compute bar heights
      let barHeight = Math.ceil(this.height * stepRatio)
      let barVoid = (this.height - barHeight)/2

      // adjust offset for cleaner draw
      woffset = Math.floor(woffset)+0.5

      // color
      this.ctx.beginPath()
      if (idxRatio > seekableRatio){
        // unseekable
        this.ctx.strokeStyle = this.config.wfDisabledCol
      } else {
        // seekable
        if (this.time <= idxRatio) {
          this.ctx.strokeStyle = this.config.wfGreyCol
        } else {
          this.ctx.strokeStyle = this.config.wfMainCol
        }
      }

      // draw
      this.ctx.lineWidth = BAR_WIDTH
      this.ctx.moveTo(woffset, barVoid)
      this.ctx.lineTo(woffset, barVoid+barHeight)
      this.ctx.stroke()

      // inc the offset in real pixel width
      woffset += BAR_SPACE+BAR_WIDTH
    }

    // draw progress
    let progressOffset = this.width * this.time

    // draw
    this.ctx.beginPath()
    this.ctx.strokeStyle = this.config.wfTickColor
    this.ctx.lineWidth = BAR_WIDTH*2
    this.ctx.moveTo(progressOffset, 0)
    this.ctx.lineTo(progressOffset, this.height)
    this.ctx.stroke()
  }

  // event listeners, internal, for the canvas
  __onCanvasClick(e) {
    const ratio = e.offsetX / this.width
    if(this.audio){
      // play/pause trick
      if ((ratio*this.backendDuration) >= this.seekableDuration){
        this.audio.currentTime = this.seekableDuration - 1
      } else {
        this.audio.currentTime = ratio*this.backendDuration
      }
    }
  }

  // setups the listeners
  _setupPlayerListeners(){
    this.audio.addEventListener('loadstart', this.__loadstart.bind(this))
    this.audio.addEventListener('play', this.__play.bind(this))
    this.audio.addEventListener('pause', this.__pause.bind(this))
    this.audio.addEventListener('waiting', this.__waiting.bind(this))
    this.audio.addEventListener('abort', this.__abort.bind(this))
    this.audio.addEventListener('canplay', this.__canplay.bind(this))
    this.audio.addEventListener('timeupdate', this.__timeupdate.bind(this))
  }

  // event listeners, for the player
  __loadstart(){
    this.loading = true
    // console.log('loadstart')
  }

  __play(){
    this.listeners['play'] ? this.listeners['play']() : ''
    // console.log('play')
  }

  __pause(){
    this.listeners['pause'] ? this.listeners['pause']() : ''
    // console.log('pause')
  }

  __canplay(){
    this.loading = false

    // force redraw
    this._draw()
    // console.log('canplay')
  }

  __waiting(){
    this.loading = true
    // console.log('waiting')
  }

  __abort(){
    // console.log('abort')
  }

  __error(){
    // console.log('error')
  }

  __timeupdate(){
    this._updateTime(this.audio.currentTime, this.backendDuration, this.audio.duration)
    // console.log(this.audio.currentTime, this.backendDuration, this.audio.duration)
  }
}


