
// import axios from 'axios'

const _fallBackHTML5 = (url, audio) => {
  // check format
  let mediaType = 'audio/mp4'
  if (url.includes('aac')){
    mediaType = 'audio/aac'
  }
  audio.type = mediaType
  audio.src =url
}

// takes care of MSE
export const CreateMedia = (url, audio) => {

  _fallBackHTML5(url, audio)
  return

  //@TODO implement via MSE ?
}